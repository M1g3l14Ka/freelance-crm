import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  projectFindMany: vi.fn(),
  subscriptionFindMany: vi.fn(),
  budgetLimitFindMany: vi.fn(),
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/auth-guard", () => ({ requireUser: mocks.requireUser }))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: { findMany: mocks.projectFindMany },
    subscription: { findMany: mocks.subscriptionFindMany },
    budgetLimit: { findMany: mocks.budgetLimitFindMany },
  },
}))

import { POST } from "./route"

describe("Gemini demo protection", () => {
  beforeEach(() => {
    process.env.DEMO_USER_ID = "demo-user"
    mocks.requireUser.mockResolvedValue({ id: "demo-user", email: "demo@example.invalid", isDemo: true })
    vi.stubGlobal("fetch", vi.fn())
  })

  it("rejects demo users before querying data or calling the provider", async () => {
    const response = await POST(new Request("http://localhost/api/gemini", { method: "POST" }))

    expect(response.status).toBe(403)
    await expect(response.json()).resolves.toEqual({
      error: "AI requests are disabled in the public demo",
    })
    expect(mocks.projectFindMany).not.toHaveBeenCalled()
    expect(fetch).not.toHaveBeenCalled()
  })
})
