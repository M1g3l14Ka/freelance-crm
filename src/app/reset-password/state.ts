export const INVALID_RESET_LINK_RESPONSE =
  "This password reset link is invalid or has expired."
export const RESET_PASSWORD_SUCCESS_RESPONSE =
  "Your password has been updated. You can now sign in with your new password."

export type ResetPasswordState = {
  success: boolean
  message: string | null
}
