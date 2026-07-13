"use server"

import {
  InvalidPasswordResetTokenError,
  PasswordResetValidationError,
  resetPasswordWithToken,
} from "@/lib/password-reset"
import {
  INVALID_RESET_LINK_RESPONSE,
  RESET_PASSWORD_SUCCESS_RESPONSE,
  type ResetPasswordState,
} from "./state"

export async function submitPasswordReset(
  previousState: ResetPasswordState,
  formData: FormData
): Promise<ResetPasswordState> {
  void previousState

  try {
    await resetPasswordWithToken({
      token: formData.get("token"),
      newPassword: formData.get("password"),
      passwordConfirmation: formData.get("passwordConfirmation"),
    })
    return { success: true, message: RESET_PASSWORD_SUCCESS_RESPONSE }
  } catch (error) {
    if (error instanceof PasswordResetValidationError) {
      return { success: false, message: error.message }
    }
    if (error instanceof InvalidPasswordResetTokenError) {
      return { success: false, message: INVALID_RESET_LINK_RESPONSE }
    }
    return { success: false, message: INVALID_RESET_LINK_RESPONSE }
  }
}
