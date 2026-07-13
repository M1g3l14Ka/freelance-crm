import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  allowAttempt: vi.fn(),
  issueToken: vi.fn(),
  invalidateToken: vi.fn(),
  buildUrl: vi.fn(),
  sendEmail: vi.fn(),
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/forgot-password-rate-limit", () => ({
  allowForgotPasswordAttempt: mocks.allowAttempt,
}))
vi.mock("@/lib/password-reset", () => ({
  issuePasswordResetToken: mocks.issueToken,
  invalidateIssuedPasswordResetToken: mocks.invalidateToken,
}))
vi.mock("@/lib/password-reset-email", () => ({
  buildPasswordResetUrl: mocks.buildUrl,
  sendPasswordResetEmail: mocks.sendEmail,
}))

import { requestPasswordReset } from "./actions"
import { FORGOT_PASSWORD_RESPONSE } from "./state"

const token = "a".repeat(43)
const initialState = { submitted: false, message: null }

function form(email: string) {
  const formData = new FormData()
  formData.set("email", email)
  return formData
}

describe("forgot-password public action", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.allowAttempt.mockReturnValue(true)
    mocks.issueToken.mockResolvedValue({
      token,
      expiresAt: new Date("2026-07-13T12:30:00.000Z"),
    })
    mocks.buildUrl.mockReturnValue(
      `https://crm.mkfox.test/reset-password?token=${token}`
    )
    mocks.sendEmail.mockResolvedValue(undefined)
    mocks.invalidateToken.mockResolvedValue(undefined)
    vi.spyOn(console, "error").mockImplementation(() => undefined)
  })

  afterEach(() => vi.restoreAllMocks())

  it("normalizes a known email and sends its trusted reset URL", async () => {
    const result = await requestPasswordReset(
      initialState,
      form("  USER@Example.COM  ")
    )

    expect(mocks.allowAttempt).toHaveBeenCalledWith("user@example.com")
    expect(mocks.issueToken).toHaveBeenCalledWith("user@example.com")
    expect(mocks.buildUrl).toHaveBeenCalledWith(token)
    expect(mocks.sendEmail).toHaveBeenCalledWith({
      email: "user@example.com",
      resetUrl: `https://crm.mkfox.test/reset-password?token=${token}`,
    })
    expect(result).toEqual({ submitted: true, message: FORGOT_PASSWORD_RESPONSE })
  })

  it.each(["unknown", "demo", "ineligible"])(
    "returns the same response and sends no email for a %s account",
    async () => {
      mocks.issueToken.mockResolvedValue(null)

      const result = await requestPasswordReset(
        initialState,
        form("person@example.com")
      )

      expect(result).toEqual({ submitted: true, message: FORGOT_PASSWORD_RESPONSE })
      expect(mocks.sendEmail).not.toHaveBeenCalled()
    }
  )

  it("returns the generic response without issuing for malformed email", async () => {
    const result = await requestPasswordReset(initialState, form("not-an-email"))

    expect(result).toEqual({ submitted: true, message: FORGOT_PASSWORD_RESPONSE })
    expect(mocks.allowAttempt).not.toHaveBeenCalled()
    expect(mocks.issueToken).not.toHaveBeenCalled()
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })

  it("keeps the response generic when rate limited and sends no email", async () => {
    mocks.allowAttempt.mockReturnValue(false)

    const result = await requestPasswordReset(
      initialState,
      form("user@example.com")
    )

    expect(result).toEqual({ submitted: true, message: FORGOT_PASSWORD_RESPONSE })
    expect(mocks.issueToken).not.toHaveBeenCalled()
    expect(mocks.sendEmail).not.toHaveBeenCalled()
  })

  it("invalidates only the newly issued token after delivery failure", async () => {
    mocks.sendEmail.mockRejectedValue(new Error("SMTP unavailable"))

    const result = await requestPasswordReset(
      initialState,
      form("user@example.com")
    )

    expect(result).toEqual({ submitted: true, message: FORGOT_PASSWORD_RESPONSE })
    expect(mocks.invalidateToken).toHaveBeenCalledWith(token)
  })
})
