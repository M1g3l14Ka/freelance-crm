import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import {
  AiProviderTimeoutError,
  AiRateLimitError,
} from "@/lib/ai/errors"

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  sendConversationMessage: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }))
vi.mock("@/lib/ai/service", () => ({
  sendConversationMessage: mocks.sendConversationMessage,
}))
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }))

import { POST } from "./route"

const validConversationId = "cm12345678901234567890123"

function request(body: unknown) {
  return new Request("http://localhost/api/gemini", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  })
}

describe("Gemini conversation route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.DEMO_USER_ID = "demo-user"
    mocks.auth.mockResolvedValue({
      user: { id: "user-a", email: "a@example.com", isDemo: false },
    })
    mocks.sendConversationMessage.mockResolvedValue({
      id: validConversationId,
      title: "How is my income?",
      createdAt: new Date("2026-07-13T12:00:00.000Z"),
      updatedAt: new Date("2026-07-13T12:00:01.000Z"),
      messages: [
        {
          id: "message-user",
          role: "USER",
          content: "How is my income?",
          createdAt: new Date("2026-07-13T12:00:00.000Z"),
        },
        {
          id: "message-assistant",
          role: "ASSISTANT",
          content: "Income is stable.",
          createdAt: new Date("2026-07-13T12:00:01.000Z"),
        },
      ],
    })
  })

  afterEach(() => {
    delete process.env.DEMO_USER_ID
  })

  it("rejects unauthenticated requests", async () => {
    mocks.auth.mockResolvedValue(null)

    const response = await POST(request({ message: "Hello" }))

    expect(response.status).toBe(401)
    expect(mocks.sendConversationMessage).not.toHaveBeenCalled()
  })

  it("rejects demo users before service or provider activity", async () => {
    mocks.auth.mockResolvedValue({
      user: { id: "demo-user", email: "demo@example.invalid", isDemo: true },
    })

    const response = await POST(request({ message: "Hello" }))

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toMatchObject({
      error: "AI requests are disabled in the public demo",
    })
    expect(mocks.sendConversationMessage).not.toHaveBeenCalled()
  })

  it("creates a conversation response for a normal user's first message", async () => {
    const response = await POST(request({ message: "  How is my income?  " }))

    expect(response.status).toBe(200)
    expect(mocks.sendConversationMessage).toHaveBeenCalledWith("user-a", {
      message: "How is my income?",
    })
    await expect(response.json()).resolves.toMatchObject({
      conversation: { id: validConversationId },
      messages: [{ role: "USER" }, { role: "ASSISTANT" }],
    })
  })

  it.each([
    [{ message: "   " }, "Message cannot be empty"],
    [{ message: "x".repeat(2_001) }, "Message must be 2,000 characters or fewer"],
    [{ message: "Hello", extra: true }, "Request contains unknown fields"],
    [
      { message: "Hello", conversationId: "not-an-id" },
      "Conversation ID is invalid",
    ],
  ])("rejects invalid input %#", async (body, expectedError) => {
    const response = await POST(request(body))

    expect(response.status).toBe(400)
    await expect(response.json()).resolves.toMatchObject({ error: expectedError })
    expect(mocks.sendConversationMessage).not.toHaveBeenCalled()
  })

  it("returns a safe timeout response", async () => {
    mocks.sendConversationMessage.mockRejectedValue(new AiProviderTimeoutError())

    const response = await POST(request({ message: "Hello" }))

    expect(response.status).toBe(504)
    await expect(response.json()).resolves.toMatchObject({
      code: "AI_PROVIDER_TIMEOUT",
    })
  })

  it("maps burst and daily rate limits to 429", async () => {
    mocks.sendConversationMessage.mockRejectedValue(
      new AiRateLimitError("Daily assistant message limit reached. Try again tomorrow.")
    )

    const response = await POST(request({ message: "Hello" }))

    expect(response.status).toBe(429)
    await expect(response.json()).resolves.toMatchObject({ code: "AI_RATE_LIMITED" })
  })
})
