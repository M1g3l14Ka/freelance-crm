import "server-only"

import { createHash, randomBytes } from "node:crypto"
import {
  hashPassword,
  normalizeEmail,
  validatePassword,
} from "@/lib/credentials"
import { isDemoUserId } from "@/lib/demo"
import { prisma } from "@/lib/prisma"

const TOKEN_BYTES = 32
const TOKEN_LIFETIME_MS = 30 * 60 * 1_000
const TOKEN_ISSUE_COOLDOWN_MS = 5 * 60 * 1_000
const TOKEN_PATTERN = /^[A-Za-z0-9_-]{43}$/

export class PasswordResetValidationError extends Error {
  readonly code = "PASSWORD_RESET_VALIDATION"

  constructor(message: string) {
    super(message)
    this.name = "PasswordResetValidationError"
  }
}

export class InvalidPasswordResetTokenError extends Error {
  readonly code = "PASSWORD_RESET_TOKEN_INVALID"

  constructor() {
    super("Invalid or expired password reset token")
    this.name = "InvalidPasswordResetTokenError"
  }
}

export class PasswordResetServiceError extends Error {
  readonly code = "PASSWORD_RESET_UNAVAILABLE"

  constructor() {
    super("Password reset is temporarily unavailable")
    this.name = "PasswordResetServiceError"
  }
}

export function generatePasswordResetToken() {
  return randomBytes(TOKEN_BYTES).toString("base64url")
}

export function hashPasswordResetToken(token: string) {
  return createHash("sha256").update(token, "utf8").digest("hex")
}

export async function issuePasswordResetToken(email: string) {
  const normalizedEmail = normalizeEmail(email)
  const now = new Date()

  try {
    await prisma.passwordResetToken.deleteMany({
      where: { expiresAt: { lte: now } },
    })

    const user = await prisma.user.findUnique({
      where: { email: normalizedEmail },
      select: {
        id: true,
        password: true,
        passwordResetTokens: {
          where: {
            usedAt: null,
            expiresAt: { gt: now },
            createdAt: {
              gte: new Date(now.getTime() - TOKEN_ISSUE_COOLDOWN_MS),
            },
          },
          select: { id: true },
          take: 1,
        },
      },
    })

    if (!user || !user.password || isDemoUserId(user.id)) return null
    if ((user.passwordResetTokens?.length ?? 0) > 0) return null

    const token = generatePasswordResetToken()
    const tokenHash = hashPasswordResetToken(token)
    const expiresAt = new Date(now.getTime() + TOKEN_LIFETIME_MS)

    await prisma.$transaction(async (transaction) => {
      await transaction.passwordResetToken.deleteMany({
        where: { userId: user.id, usedAt: null },
      })
      await transaction.passwordResetToken.create({
        data: {
          userId: user.id,
          tokenHash,
          expiresAt,
        },
        select: { id: true },
      })
    })

    return { token, expiresAt }
  } catch (error) {
    console.error("Password reset token issuance failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    })
    throw new PasswordResetServiceError()
  }
}

export async function invalidateIssuedPasswordResetToken(token: string) {
  if (!TOKEN_PATTERN.test(token)) return

  try {
    await prisma.passwordResetToken.deleteMany({
      where: {
        tokenHash: hashPasswordResetToken(token),
        usedAt: null,
      },
    })
  } catch (error) {
    console.error("Password reset token cleanup failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    })
    throw new PasswordResetServiceError()
  }
}

type ResetPasswordInput = {
  token: unknown
  newPassword: unknown
  passwordConfirmation: unknown
}

export async function resetPasswordWithToken({
  token,
  newPassword,
  passwordConfirmation,
}: ResetPasswordInput) {
  if (typeof token !== "string" || !TOKEN_PATTERN.test(token)) {
    throw new InvalidPasswordResetTokenError()
  }

  const passwordError = validatePassword(newPassword)
  if (passwordError) throw new PasswordResetValidationError(passwordError)
  if (
    typeof passwordConfirmation !== "string" ||
    newPassword !== passwordConfirmation
  ) {
    throw new PasswordResetValidationError("Passwords do not match")
  }

  const tokenHash = hashPasswordResetToken(token)
  const now = new Date()

  let resetToken
  try {
    resetToken = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      select: {
        id: true,
        userId: true,
        tokenHash: true,
        expiresAt: true,
        usedAt: true,
        user: { select: { password: true } },
      },
    })
  } catch (error) {
    console.error("Password reset token lookup failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    })
    throw new InvalidPasswordResetTokenError()
  }

  if (
    !resetToken ||
    resetToken.usedAt !== null ||
    resetToken.expiresAt <= now ||
    !resetToken.user.password ||
    isDemoUserId(resetToken.userId)
  ) {
    throw new InvalidPasswordResetTokenError()
  }

  let newPasswordHash: string
  try {
    newPasswordHash = await hashPassword(newPassword)
  } catch (error) {
    console.error("Password reset hashing failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    })
    throw new InvalidPasswordResetTokenError()
  }

  try {
    await prisma.$transaction(async (transaction) => {
      const claim = await transaction.passwordResetToken.updateMany({
        where: {
          id: resetToken.id,
          userId: resetToken.userId,
          tokenHash,
          usedAt: null,
          expiresAt: { gt: now },
        },
        data: { usedAt: now },
      })

      if (claim.count !== 1) throw new InvalidPasswordResetTokenError()

      await transaction.user.update({
        where: { id: resetToken.userId },
        data: { password: newPasswordHash },
        select: { id: true },
      })

      await transaction.passwordResetToken.updateMany({
        where: {
          userId: resetToken.userId,
          id: { not: resetToken.id },
          usedAt: null,
        },
        data: { usedAt: now },
      })
    })
  } catch (error) {
    if (error instanceof InvalidPasswordResetTokenError) throw error
    console.error("Password reset transaction failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    })
    throw new InvalidPasswordResetTokenError()
  }

  return { success: true as const }
}
