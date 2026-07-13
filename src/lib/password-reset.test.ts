import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"
import bcrypt from "bcryptjs"

const mocks = vi.hoisted(() => ({
  userFindUnique: vi.fn(),
  tokenDeleteMany: vi.fn(),
  tokenFindUnique: vi.fn(),
  transaction: vi.fn(),
  transactionTokenDeleteMany: vi.fn(),
  transactionTokenCreate: vi.fn(),
  transactionTokenUpdateMany: vi.fn(),
  transactionUserUpdate: vi.fn(),
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    user: { findUnique: mocks.userFindUnique },
    passwordResetToken: {
      deleteMany: mocks.tokenDeleteMany,
      findUnique: mocks.tokenFindUnique,
    },
    $transaction: mocks.transaction,
  },
}))

import {
  generatePasswordResetToken,
  hashPasswordResetToken,
  InvalidPasswordResetTokenError,
  issuePasswordResetToken,
  invalidateIssuedPasswordResetToken,
  PasswordResetValidationError,
  resetPasswordWithToken,
} from "@/lib/password-reset"

const validToken = generatePasswordResetToken()
const validPassword = "NewPassword123"

function resetTokenRecord(
  overrides: Partial<{
    id: string
    userId: string
    expiresAt: Date
    usedAt: Date | null
    userPassword: string | null
  }> = {}
) {
  return {
    id: overrides.id ?? "reset-token-id",
    userId: overrides.userId ?? "user-a",
    tokenHash: hashPasswordResetToken(validToken),
    expiresAt: overrides.expiresAt ?? new Date(Date.now() + 30 * 60 * 1_000),
    usedAt: overrides.usedAt ?? null,
    user: { password: overrides.userPassword ?? "existing-password-hash" },
  }
}

async function validReset() {
  return resetPasswordWithToken({
    token: validToken,
    newPassword: validPassword,
    passwordConfirmation: validPassword,
  })
}

describe("password reset security core", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.DEMO_USER_ID
    mocks.tokenDeleteMany.mockResolvedValue({ count: 0 })
    mocks.userFindUnique.mockResolvedValue({
      id: "user-a",
      password: "existing-password-hash",
    })
    mocks.tokenFindUnique.mockResolvedValue(resetTokenRecord())
    mocks.transactionTokenDeleteMany.mockResolvedValue({ count: 1 })
    mocks.transactionTokenCreate.mockResolvedValue({ id: "created-token-id" })
    mocks.transactionTokenUpdateMany.mockResolvedValue({ count: 1 })
    mocks.transactionUserUpdate.mockResolvedValue({ id: "user-a" })
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        passwordResetToken: {
          deleteMany: mocks.transactionTokenDeleteMany,
          create: mocks.transactionTokenCreate,
          updateMany: mocks.transactionTokenUpdateMany,
        },
        user: { update: mocks.transactionUserUpdate },
      })
    )
    vi.spyOn(console, "error").mockImplementation(() => undefined)
  })

  afterEach(() => {
    delete process.env.DEMO_USER_ID
    vi.restoreAllMocks()
    vi.useRealTimers()
  })

  it("generates unique URL-safe tokens from at least 32 random bytes", () => {
    const first = generatePasswordResetToken()
    const second = generatePasswordResetToken()

    expect(first).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(Buffer.from(first, "base64url")).toHaveLength(32)
    expect(second).toMatch(/^[A-Za-z0-9_-]{43}$/)
    expect(second).not.toBe(first)
  })

  it("hashes tokens with SHA-256", () => {
    expect(hashPasswordResetToken("abc")).toBe(
      "ba7816bf8f01cfea414140de5dae2223b00361a396177a9cb410ff61f20015ad"
    )
  })

  it("stores only the token hash and returns the raw token to the server caller", async () => {
    const result = await issuePasswordResetToken("  USER@Example.COM  ")

    expect(result).not.toBeNull()
    if (!result) throw new Error("Expected an issued token")
    expect(mocks.userFindUnique).toHaveBeenCalledWith({
      where: { email: "user@example.com" },
      select: {
        id: true,
        password: true,
        passwordResetTokens: {
          where: {
            usedAt: null,
            expiresAt: { gt: expect.any(Date) },
            createdAt: { gte: expect.any(Date) },
          },
          select: { id: true },
          take: 1,
        },
      },
    })
    expect(mocks.transactionTokenCreate).toHaveBeenCalledWith({
      data: {
        userId: "user-a",
        tokenHash: hashPasswordResetToken(result.token),
        expiresAt: result.expiresAt,
      },
      select: { id: true },
    })
    expect(JSON.stringify(mocks.transactionTokenCreate.mock.calls)).not.toContain(
      result.token
    )
    expect(JSON.stringify(vi.mocked(console.error).mock.calls)).not.toContain(
      result.token
    )
  })

  it("expires issued tokens approximately 30 minutes after server time", async () => {
    const beforeIssue = Date.now()
    const result = await issuePasswordResetToken("user@example.com")
    const afterIssue = Date.now()

    expect(result).not.toBeNull()
    if (!result) throw new Error("Expected an issued token")
    expect(result.expiresAt.getTime()).toBeGreaterThanOrEqual(
      beforeIssue + 30 * 60 * 1_000
    )
    expect(result.expiresAt.getTime()).toBeLessThanOrEqual(
      afterIssue + 30 * 60 * 1_000
    )
  })

  it("removes expired tokens and previous unused tokens when issuing a new one", async () => {
    await issuePasswordResetToken("user@example.com")

    expect(mocks.tokenDeleteMany).toHaveBeenCalledWith({
      where: { expiresAt: { lte: expect.any(Date) } },
    })
    expect(mocks.transactionTokenDeleteMany).toHaveBeenCalledWith({
      where: { userId: "user-a", usedAt: null },
    })
    expect(mocks.transactionTokenCreate).toHaveBeenCalledOnce()
  })

  it("returns no token for an unknown email", async () => {
    mocks.userFindUnique.mockResolvedValue(null)

    await expect(issuePasswordResetToken("missing@example.com")).resolves.toBeNull()
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it("returns no token for the demo user", async () => {
    process.env.DEMO_USER_ID = "demo-user"
    mocks.userFindUnique.mockResolvedValue({
      id: "demo-user",
      password: "existing-password-hash",
    })

    await expect(issuePasswordResetToken("demo@example.invalid")).resolves.toBeNull()
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it("does not issue another token during the server-side cooldown", async () => {
    mocks.userFindUnique.mockResolvedValue({
      id: "user-a",
      password: "existing-password-hash",
      passwordResetTokens: [{ id: "recent-token" }],
    })

    await expect(issuePasswordResetToken("user@example.com")).resolves.toBeNull()
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it("invalidates a failed-delivery token by its hash without storing the raw token", async () => {
    await invalidateIssuedPasswordResetToken(validToken)

    expect(mocks.tokenDeleteMany).toHaveBeenCalledWith({
      where: {
        tokenHash: hashPasswordResetToken(validToken),
        usedAt: null,
      },
    })
    expect(JSON.stringify(mocks.tokenDeleteMany.mock.calls)).not.toContain(validToken)
  })

  it("changes the token owner's password using the shared bcrypt implementation", async () => {
    await expect(validReset()).resolves.toEqual({ success: true })

    expect(mocks.transactionUserUpdate).toHaveBeenCalledWith({
      where: { id: "user-a" },
      data: { password: expect.any(String) },
      select: { id: true },
    })
    const passwordHash: unknown = mocks.transactionUserUpdate.mock.calls[0]?.[0]?.data
      ?.password
    expect(typeof passwordHash).toBe("string")
    if (typeof passwordHash !== "string") throw new Error("Expected password hash")
    await expect(bcrypt.compare(validPassword, passwordHash)).resolves.toBe(true)
    expect(passwordHash).not.toBe(validPassword)
  })

  it("rejects mismatched password confirmation before database access", async () => {
    await expect(
      resetPasswordWithToken({
        token: validToken,
        newPassword: validPassword,
        passwordConfirmation: "DifferentPassword123",
      })
    ).rejects.toBeInstanceOf(PasswordResetValidationError)
    expect(mocks.tokenFindUnique).not.toHaveBeenCalled()
    expect(mocks.transactionUserUpdate).not.toHaveBeenCalled()
  })

  it("rejects weak passwords through the shared password policy", async () => {
    await expect(
      resetPasswordWithToken({
        token: validToken,
        newPassword: "weak",
        passwordConfirmation: "weak",
      })
    ).rejects.toMatchObject({
      message: "Password must be 8-128 characters and include a letter and a number",
    })
    expect(mocks.tokenFindUnique).not.toHaveBeenCalled()
    expect(mocks.transactionUserUpdate).not.toHaveBeenCalled()
  })

  it.each([undefined, "", "not a valid token", "a".repeat(42)])(
    "rejects a missing or invalid token safely %#",
    async (token) => {
      await expect(
        resetPasswordWithToken({
          token,
          newPassword: validPassword,
          passwordConfirmation: validPassword,
        })
      ).rejects.toBeInstanceOf(InvalidPasswordResetTokenError)
      expect(mocks.tokenFindUnique).not.toHaveBeenCalled()
      expect(mocks.transactionUserUpdate).not.toHaveBeenCalled()
    }
  )

  it("rejects an expired token", async () => {
    mocks.tokenFindUnique.mockResolvedValue(
      resetTokenRecord({ expiresAt: new Date(Date.now() - 1) })
    )

    await expect(validReset()).rejects.toBeInstanceOf(InvalidPasswordResetTokenError)
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it("rejects an already-used token", async () => {
    mocks.tokenFindUnique.mockResolvedValue(
      resetTokenRecord({ usedAt: new Date(Date.now() - 1_000) })
    )

    await expect(validReset()).rejects.toBeInstanceOf(InvalidPasswordResetTokenError)
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it("claims a token exactly once across sequential reset attempts", async () => {
    let claimed = false
    mocks.transactionTokenUpdateMany.mockImplementation(async (input) => {
      if (!("tokenHash" in input.where)) return { count: 1 }
      if (claimed) return { count: 0 }
      claimed = true
      return { count: 1 }
    })

    await expect(validReset()).resolves.toEqual({ success: true })
    await expect(validReset()).rejects.toBeInstanceOf(InvalidPasswordResetTokenError)
    expect(mocks.transactionUserUpdate).toHaveBeenCalledOnce()
  })

  it("allows only one of two concurrent reset attempts to claim the token", async () => {
    let claimed = false
    mocks.transactionTokenUpdateMany.mockImplementation(async (input) => {
      if (!("tokenHash" in input.where)) return { count: 1 }
      if (claimed) return { count: 0 }
      claimed = true
      return { count: 1 }
    })

    const results = await Promise.allSettled([validReset(), validReset()])

    expect(results.filter((result) => result.status === "fulfilled")).toHaveLength(1)
    expect(results.filter((result) => result.status === "rejected")).toHaveLength(1)
    expect(mocks.transactionUserUpdate).toHaveBeenCalledOnce()
  })

  it("does not modify the password when the atomic token claim fails", async () => {
    mocks.transactionTokenUpdateMany.mockResolvedValue({ count: 0 })

    await expect(validReset()).rejects.toBeInstanceOf(InvalidPasswordResetTokenError)
    expect(mocks.transactionUserUpdate).not.toHaveBeenCalled()
  })

  it("marks other unused tokens for the owner as used after success", async () => {
    await validReset()

    expect(mocks.transactionTokenUpdateMany).toHaveBeenNthCalledWith(2, {
      where: {
        userId: "user-a",
        id: { not: "reset-token-id" },
        usedAt: null,
      },
      data: { usedAt: expect.any(Date) },
    })
  })

  it("can update only the user identified by the matching token", async () => {
    mocks.tokenFindUnique.mockResolvedValue(
      resetTokenRecord({ userId: "token-owner" })
    )

    await validReset()

    expect(mocks.transactionUserUpdate).toHaveBeenCalledWith({
      where: { id: "token-owner" },
      data: { password: expect.any(String) },
      select: { id: true },
    })
    expect(JSON.stringify(mocks.transactionUserUpdate.mock.calls)).not.toContain(
      "another-user"
    )
  })

  it("cannot change the demo user's password", async () => {
    process.env.DEMO_USER_ID = "demo-user"
    mocks.tokenFindUnique.mockResolvedValue(
      resetTokenRecord({ userId: "demo-user" })
    )

    await expect(validReset()).rejects.toBeInstanceOf(InvalidPasswordResetTokenError)
    expect(mocks.transaction).not.toHaveBeenCalled()
    expect(mocks.transactionUserUpdate).not.toHaveBeenCalled()
  })
})
