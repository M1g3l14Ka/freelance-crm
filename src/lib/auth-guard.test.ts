import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ auth: vi.fn() }))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/auth", () => ({ auth: mocks.auth }))

import { AuthenticationRequiredError, requireUser, requireWritableUser } from "@/lib/auth-guard"
import { isDemoUserId, ReadOnlyDemoError } from "@/lib/demo"

describe("demo authorization policy", () => {
  beforeEach(() => {
    process.env.DEMO_USER_ID = "demo-user"
    mocks.auth.mockResolvedValue({ user: { id: "normal-user", email: "normal@example.com" } })
  })

  afterEach(() => {
    delete process.env.DEMO_USER_ID
    vi.clearAllMocks()
  })

  it("allows authenticated demo users to read", async () => {
    mocks.auth.mockResolvedValue({ user: { id: "demo-user", email: "demo@example.invalid" } })
    await expect(requireUser()).resolves.toMatchObject({ id: "demo-user" })
  })

  it("rejects unauthenticated users", async () => {
    mocks.auth.mockResolvedValue(null)
    await expect(requireUser()).rejects.toBeInstanceOf(AuthenticationRequiredError)
  })

  it("allows normal users to write and rejects the configured demo user", async () => {
    await expect(requireWritableUser()).resolves.toMatchObject({ id: "normal-user" })
    mocks.auth.mockResolvedValue({ user: { id: "demo-user", email: "demo@example.invalid" } })
    await expect(requireWritableUser()).rejects.toBeInstanceOf(ReadOnlyDemoError)
  })

  it("derives demo status only from the server-configured user ID", () => {
    expect(isDemoUserId("normal-user")).toBe(false)
    expect(isDemoUserId("demo-user")).toBe(true)
    expect(isDemoUserId("true")).toBe(false)
  })

  it("fails closed for demo features when configuration is missing", () => {
    delete process.env.DEMO_USER_ID
    expect(isDemoUserId("demo-user")).toBe(false)
  })

  it("keeps an already-issued demo session read-only if configuration disappears", async () => {
    delete process.env.DEMO_USER_ID
    mocks.auth.mockResolvedValue({
      user: { id: "demo-user", email: "demo@example.invalid", isDemo: true },
    })
    await expect(requireWritableUser()).rejects.toBeInstanceOf(ReadOnlyDemoError)
  })
})
