import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getDashboardContext: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`)
  }),
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/auth", () => ({ auth: vi.fn() }))
vi.mock("@/lib/dashboard", () => ({ getDashboardContext: mocks.getDashboardContext }))
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }))
vi.mock("@/features/dashboard/DashboardNavigation", () => ({ DashboardNavigation: () => null }))
vi.mock("@/features/auth/SignOutButton", () => ({ SignOutButton: () => null }))

import DashboardLayout from "./layout"
import { AuthenticationRequiredError } from "@/lib/auth-guard"

describe("dashboard layout authentication", () => {
  beforeEach(() => vi.clearAllMocks())

  it("redirects unauthenticated access to sign-in", async () => {
    mocks.getDashboardContext.mockRejectedValue(new AuthenticationRequiredError())

    await expect(DashboardLayout({ children: null })).rejects.toThrow("redirect:/auth/signin")
    expect(mocks.redirect).toHaveBeenCalledWith("/auth/signin")
  })

  it("rethrows unexpected failures without redirecting", async () => {
    const failure = new Error("Database unavailable")
    mocks.getDashboardContext.mockRejectedValue(failure)

    await expect(DashboardLayout({ children: null })).rejects.toBe(failure)
    expect(mocks.redirect).not.toHaveBeenCalled()
  })
})
