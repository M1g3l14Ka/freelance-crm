import { describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ requireUser: vi.fn(), isDemoUserId: vi.fn() }))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/auth-guard", () => ({ requireUser: mocks.requireUser }))
vi.mock("@/lib/demo", () => ({ isDemoUserId: mocks.isDemoUserId }))

import { getDashboardContext } from "@/lib/dashboard"

describe("dashboard context", () => {
  it("uses the centralized authenticated user and server-derived demo state", async () => {
    mocks.requireUser.mockResolvedValue({ id: "demo-user", email: "demo@example.invalid", isDemo: false })
    mocks.isDemoUserId.mockReturnValue(true)

    await expect(getDashboardContext()).resolves.toEqual({
      user: { id: "demo-user", email: "demo@example.invalid", isDemo: false },
      isDemo: true,
    })
  })

  it("propagates unauthenticated rejection from requireUser", async () => {
    mocks.requireUser.mockRejectedValue(new Error("Unauthorized"))
    await expect(getDashboardContext()).rejects.toThrow("Unauthorized")
  })
})
