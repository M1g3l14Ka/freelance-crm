import "server-only"

import { createHash } from "node:crypto"

const RATE_LIMIT_WINDOW_MS = 15 * 60 * 1_000
const RATE_LIMIT_ATTEMPTS = 3

const attemptsByEmailHash = new Map<string, number[]>()

export function hashForgotPasswordRateLimitKey(normalizedEmail: string) {
  return createHash("sha256").update(normalizedEmail, "utf8").digest("hex")
}

export function allowForgotPasswordAttempt(
  normalizedEmail: string,
  now = Date.now()
): boolean {
  const key = hashForgotPasswordRateLimitKey(normalizedEmail)
  const windowStart = now - RATE_LIMIT_WINDOW_MS
  const recentAttempts = (attemptsByEmailHash.get(key) ?? []).filter(
    (attempt) => attempt > windowStart
  )

  if (recentAttempts.length >= RATE_LIMIT_ATTEMPTS) {
    attemptsByEmailHash.set(key, recentAttempts)
    return false
  }

  attemptsByEmailHash.set(key, [...recentAttempts, now])
  return true
}

export function clearForgotPasswordRateLimits() {
  attemptsByEmailHash.clear()
}

export function getForgotPasswordRateLimitKeysForTests() {
  return [...attemptsByEmailHash.keys()]
}
