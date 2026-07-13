"use server"

import { isValidEmail, normalizeEmail } from "@/lib/credentials"
import { allowForgotPasswordAttempt } from "@/lib/forgot-password-rate-limit"
import {
  buildPasswordResetUrl,
  sendPasswordResetEmail,
} from "@/lib/password-reset-email"
import {
  invalidateIssuedPasswordResetToken,
  issuePasswordResetToken,
} from "@/lib/password-reset"
import { FORGOT_PASSWORD_RESPONSE, type ForgotPasswordState } from "./state"

export async function requestPasswordReset(
  previousState: ForgotPasswordState,
  formData: FormData
): Promise<ForgotPasswordState> {
  void previousState
  const emailValue = formData.get("email")
  if (typeof emailValue !== "string") {
    return { submitted: true, message: FORGOT_PASSWORD_RESPONSE }
  }

  const normalizedEmail = normalizeEmail(emailValue)
  if (
    !isValidEmail(normalizedEmail) ||
    !allowForgotPasswordAttempt(normalizedEmail)
  ) {
    return { submitted: true, message: FORGOT_PASSWORD_RESPONSE }
  }

  let issuedToken: Awaited<ReturnType<typeof issuePasswordResetToken>> = null
  try {
    issuedToken = await issuePasswordResetToken(normalizedEmail)
    if (!issuedToken) {
      return { submitted: true, message: FORGOT_PASSWORD_RESPONSE }
    }

    const resetUrl = buildPasswordResetUrl(issuedToken.token)
    await sendPasswordResetEmail({ email: normalizedEmail, resetUrl })
  } catch (error) {
    console.error("Password reset delivery workflow failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    })
    if (issuedToken) {
      try {
        await invalidateIssuedPasswordResetToken(issuedToken.token)
      } catch {
        // The token service records safe diagnostics; the public response stays generic.
      }
    }
  }

  return { submitted: true, message: FORGOT_PASSWORD_RESPONSE }
}
