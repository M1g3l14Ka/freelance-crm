export const FORGOT_PASSWORD_RESPONSE =
  "If an account exists for that email, a password reset link has been sent."

export type ForgotPasswordState = {
  submitted: boolean
  message: string | null
}
