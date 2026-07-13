import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import {
  allowForgotPasswordAttempt,
  clearForgotPasswordRateLimits,
  getForgotPasswordRateLimitKeysForTests,
  hashForgotPasswordRateLimitKey,
} from "@/lib/forgot-password-rate-limit"

describe("forgot-password rate limiter", () => {
  beforeEach(() => clearForgotPasswordRateLimits())
  afterEach(() => clearForgotPasswordRateLimits())

  it("allows approximately three attempts per normalized email in 15 minutes", () => {
    const now = Date.parse("2026-07-13T12:00:00.000Z")

    expect(allowForgotPasswordAttempt("user@example.com", now)).toBe(true)
    expect(allowForgotPasswordAttempt("user@example.com", now + 1)).toBe(true)
    expect(allowForgotPasswordAttempt("user@example.com", now + 2)).toBe(true)
    expect(allowForgotPasswordAttempt("user@example.com", now + 3)).toBe(false)
    expect(
      allowForgotPasswordAttempt("user@example.com", now + 15 * 60 * 1_000 + 1)
    ).toBe(true)
  })

  it("stores only SHA-256 email hashes as keys", () => {
    const normalizedEmail = "private@example.com"
    allowForgotPasswordAttempt(normalizedEmail)

    expect(getForgotPasswordRateLimitKeysForTests()).toEqual([
      hashForgotPasswordRateLimitKey(normalizedEmail),
    ])
    expect(JSON.stringify(getForgotPasswordRateLimitKeysForTests())).not.toContain(
      normalizedEmail
    )
  })
})
