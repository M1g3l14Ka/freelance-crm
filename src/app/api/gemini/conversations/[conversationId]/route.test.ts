import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import { ConversationNotFoundError } from "@/lib/ai/errors"

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  deleteConversationForUser: vi.fn(),
  revalidatePath: vi.fn(),
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }))
vi.mock("@/lib/ai/conversations", () => ({
  deleteConversationForUser: mocks.deleteConversationForUser,
}))
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }))

import { DELETE } from "./route"

const conversationId = "cm12345678901234567890123"

function deleteRequest(id = conversationId) {
  return DELETE(
    new Request(`http://localhost/api/gemini/conversations/${id}`, {
      method: "DELETE",
    }),
    { params: Promise.resolve({ conversationId: id }) }
  )
}

describe("delete AI conversation route", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    process.env.DEMO_USER_ID = "demo-user"
    mocks.auth.mockResolvedValue({
      user: { id: "user-a", email: "a@example.com", isDemo: false },
    })
    mocks.deleteConversationForUser.mockResolvedValue(undefined)
  })

  afterEach(() => delete process.env.DEMO_USER_ID)

  it("rejects unauthenticated deletion", async () => {
    mocks.auth.mockResolvedValue(null)

    const response = await deleteRequest()

    expect(response.status).toBe(401)
    expect(mocks.deleteConversationForUser).not.toHaveBeenCalled()
  })

  it("rejects demo deletion before touching conversation data", async () => {
    mocks.auth.mockResolvedValue({
      user: { id: "demo-user", email: "demo@example.invalid", isDemo: true },
    })

    const response = await deleteRequest()

    expect(response.status).toBe(403)
    expect(mocks.deleteConversationForUser).not.toHaveBeenCalled()
  })

  it("returns the same generic not-found response for foreign or missing IDs", async () => {
    mocks.deleteConversationForUser.mockRejectedValue(new ConversationNotFoundError())

    const response = await deleteRequest()

    expect(response.status).toBe(404)
    await expect(response.json()).resolves.toEqual({
      error: "Conversation not found",
      code: "CONVERSATION_NOT_FOUND",
    })
    expect(mocks.deleteConversationForUser).toHaveBeenCalledWith(
      "user-a",
      conversationId
    )
  })

  it("deletes an owned conversation", async () => {
    const response = await deleteRequest()

    expect(response.status).toBe(200)
    await expect(response.json()).resolves.toEqual({ success: true })
    expect(mocks.revalidatePath).toHaveBeenCalledWith("/dashboard/assistant")
  })
})
