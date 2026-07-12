import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  auth: vi.fn(),
  redirect: vi.fn((path: string) => {
    throw new Error(`redirect:${path}`)
  }),
}))

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }))
vi.mock("next/navigation", () => ({ redirect: mocks.redirect }))

import Home from "./page"

describe("root route", () => {
  beforeEach(() => vi.clearAllMocks())

  it("redirects authenticated users to the dashboard", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "user-a" } })
    await expect(Home()).rejects.toThrow("redirect:/dashboard")
  })

  it("redirects unauthenticated users to sign-in", async () => {
    mocks.auth.mockResolvedValue(null)
    await expect(Home()).rejects.toThrow("redirect:/auth/signin")
  })
})
