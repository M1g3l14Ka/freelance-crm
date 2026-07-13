import "server-only"

import bcrypt from "bcryptjs"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const BCRYPT_ROUNDS = 10

export const PASSWORD_POLICY_ERROR =
  "Password must be 8-128 characters and include a letter and a number"

export function normalizeEmail(email: string) {
  return email.trim().toLowerCase()
}

export function isValidEmail(email: string) {
  return email.length <= 254 && EMAIL_PATTERN.test(email)
}

export function validatePassword(password: unknown): string | null {
  if (
    typeof password !== "string" ||
    password.length < 8 ||
    password.length > 128 ||
    !/[A-Za-z]/.test(password) ||
    !/\d/.test(password)
  ) {
    return PASSWORD_POLICY_ERROR
  }

  return null
}

export function hashPassword(password: string) {
  return bcrypt.hash(password, BCRYPT_ROUNDS)
}

export function verifyPassword(password: string, passwordHash: string) {
  return bcrypt.compare(password, passwordHash)
}
