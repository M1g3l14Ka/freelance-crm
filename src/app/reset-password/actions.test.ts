import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({ resetPassword: vi.fn() }))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/password-reset", async () => {
  const actual = await vi.importActual<typeof import("@/lib/password-reset")>(
    "@/lib/password-reset"
  )
  return { ...actual, resetPasswordWithToken: mocks.resetPassword }
})

import {
  InvalidPasswordResetTokenError,
  PasswordResetValidationError,
} from "@/lib/password-reset"
import { submitPasswordReset } from "./actions"
import {
  INVALID_RESET_LINK_RESPONSE,
  RESET_PASSWORD_SUCCESS_RESPONSE,
} from "./state"

const initialState = { success: false, message: null }
const token = "a".repeat(43)

function form(overrides: Record<string, string> = {}) {
  const formData = new FormData()
  formData.set("token", overrides.token ?? token)
  formData.set("password", overrides.password ?? "NewPassword123")
  formData.set(
    "passwordConfirmation",
    overrides.passwordConfirmation ?? "NewPassword123"
  )
  return formData
}

describe("reset-password public action", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.resetPassword.mockResolvedValue({ success: true })
  })

  it("uses the existing atomic service and does not auto-login", async () => {
    const result = await submitPasswordReset(initialState, form())

    expect(mocks.resetPassword).toHaveBeenCalledWith({
      token,
      newPassword: "NewPassword123",
      passwordConfirmation: "NewPassword123",
    })
    expect(result).toEqual({ success: true, message: RESET_PASSWORD_SUCCESS_RESPONSE })
  })

  it.each(["missing", "invalid", "expired", "used"])(
    "returns the same invalid-link response for a %s token",
    async () => {
      mocks.resetPassword.mockRejectedValue(new InvalidPasswordResetTokenError())

      const result = await submitPasswordReset(initialState, form())

      expect(result).toEqual({ success: false, message: INVALID_RESET_LINK_RESPONSE })
    }
  )

  it("rejects a missing token without exposing internal details", async () => {
    mocks.resetPassword.mockRejectedValue(new InvalidPasswordResetTokenError())
    const formData = form()
    formData.delete("token")

    const result = await submitPasswordReset(initialState, formData)

    expect(mocks.resetPassword).toHaveBeenCalledWith(
      expect.objectContaining({ token: null })
    )
    expect(result).toEqual({ success: false, message: INVALID_RESET_LINK_RESPONSE })
  })

  it.each([
    "Passwords do not match",
    "Password must be 8-128 characters and include a letter and a number",
  ])("returns safe password validation feedback: %s", async (message) => {
    mocks.resetPassword.mockRejectedValue(new PasswordResetValidationError(message))

    await expect(submitPasswordReset(initialState, form())).resolves.toEqual({
      success: false,
      message,
    })
  })
})
