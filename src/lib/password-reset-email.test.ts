import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  createTransport: vi.fn(),
  sendMail: vi.fn(),
}))

vi.mock("server-only", () => ({}))
vi.mock("nodemailer", () => ({
  default: { createTransport: mocks.createTransport },
}))

import {
  buildPasswordResetUrl,
  PasswordResetEmailError,
  resetPasswordResetEmailTransportForTests,
  sendPasswordResetEmail,
} from "@/lib/password-reset-email"

const environmentKeys = [
  "APP_URL",
  "SMTP_HOST",
  "SMTP_PORT",
  "SMTP_SECURE",
  "SMTP_USER",
  "SMTP_PASS",
  "SMTP_FROM",
] as const
const originalEnvironment = Object.fromEntries(
  environmentKeys.map((key) => [key, process.env[key]])
)

const rawToken = "a".repeat(43)

describe("password reset SMTP delivery", () => {
  beforeEach(() => {
    process.env.APP_URL = "https://crm.mkfox.test"
    process.env.SMTP_HOST = "smtp.example.test"
    process.env.SMTP_PORT = "465"
    process.env.SMTP_SECURE = "true"
    process.env.SMTP_USER = "smtp-user"
    process.env.SMTP_PASS = "smtp-password"
    process.env.SMTP_FROM = "MKFox CRM <no-reply@example.test>"
    mocks.createTransport.mockReset()
    mocks.sendMail.mockReset()
    mocks.createTransport.mockReturnValue({ sendMail: mocks.sendMail })
    mocks.sendMail.mockResolvedValue({ messageId: "mock-message" })
    resetPasswordResetEmailTransportForTests()
    vi.spyOn(console, "error").mockImplementation(() => undefined)
  })

  afterEach(() => {
    for (const key of environmentKeys) {
      const originalValue = originalEnvironment[key]
      if (originalValue === undefined) delete process.env[key]
      else process.env[key] = originalValue
    }
    resetPasswordResetEmailTransportForTests()
    vi.restoreAllMocks()
  })

  it("builds the public link only from trusted APP_URL and includes the raw token", () => {
    process.env.APP_URL = "https://crm.mkfox.test/trusted-base"

    const resetUrl = buildPasswordResetUrl(rawToken)

    expect(resetUrl).toBe(
      `https://crm.mkfox.test/reset-password?token=${rawToken}`
    )
    expect(resetUrl).not.toContain("attacker.example")
  })

  it("allows localhost HTTP in test without accepting an arbitrary HTTP host", () => {
    process.env.APP_URL = "http://localhost:3000"
    expect(buildPasswordResetUrl(rawToken)).toBe(
      `http://localhost:3000/reset-password?token=${rawToken}`
    )

    process.env.APP_URL = "http://attacker.example"
    expect(() => buildPasswordResetUrl(rawToken)).toThrow(
      PasswordResetEmailError
    )
  })

  it("sends plain-text and HTML versions with SMTP_FROM", async () => {
    const resetUrl = buildPasswordResetUrl(rawToken)

    await sendPasswordResetEmail({ email: "user@example.test", resetUrl })

    expect(mocks.createTransport).toHaveBeenCalledWith(
      expect.objectContaining({
        host: "smtp.example.test",
        port: 465,
        secure: true,
        requireTLS: false,
        disableFileAccess: true,
        disableUrlAccess: true,
        logger: false,
        debug: false,
      })
    )
    expect(mocks.sendMail).toHaveBeenCalledWith(
      expect.objectContaining({
        from: "MKFox CRM <no-reply@example.test>",
        to: "user@example.test",
        subject: "Reset your MKFox CRM password",
        text: expect.stringContaining(resetUrl),
        html: expect.stringContaining(rawToken),
      })
    )
  })

  it("supports STARTTLS configuration without disabling certificate checks", async () => {
    process.env.SMTP_PORT = "587"
    process.env.SMTP_SECURE = "false"

    await sendPasswordResetEmail({
      email: "user@example.test",
      resetUrl: buildPasswordResetUrl(rawToken),
    })

    const options = mocks.createTransport.mock.calls[0]?.[0]
    expect(options).toMatchObject({ secure: false, requireTLS: true })
    expect(JSON.stringify(options)).not.toContain("rejectUnauthorized")
  })

  it("reuses the server-only transporter", async () => {
    const resetUrl = buildPasswordResetUrl(rawToken)

    await sendPasswordResetEmail({ email: "first@example.test", resetUrl })
    await sendPasswordResetEmail({ email: "second@example.test", resetUrl })

    expect(mocks.createTransport).toHaveBeenCalledOnce()
    expect(mocks.sendMail).toHaveBeenCalledTimes(2)
  })

  it.each([
    ["SMTP_HOST", undefined],
    ["SMTP_PORT", "not-a-port"],
    ["SMTP_SECURE", "yes"],
  ] as const)("rejects invalid configuration safely: %s", async (key, value) => {
    if (value === undefined) delete process.env[key]
    else process.env[key] = value

    await expect(
      sendPasswordResetEmail({
        email: "user@example.test",
        resetUrl: "https://crm.mkfox.test/reset-password",
      })
    ).rejects.toBeInstanceOf(PasswordResetEmailError)
    expect(mocks.sendMail).not.toHaveBeenCalled()
  })

  it("does not expose or log SMTP credentials, provider details, or reset tokens", async () => {
    mocks.sendMail.mockRejectedValue(
      new Error("raw SMTP response containing internal details")
    )
    const resetUrl = buildPasswordResetUrl(rawToken)

    const error = await sendPasswordResetEmail({
      email: "user@example.test",
      resetUrl,
    }).catch((deliveryError: unknown) => deliveryError)

    const serializedError = JSON.stringify(error)
    const serializedLogs = JSON.stringify(vi.mocked(console.error).mock.calls)
    expect(error).toBeInstanceOf(PasswordResetEmailError)
    expect(serializedError).not.toContain("smtp-password")
    expect(serializedLogs).not.toContain("smtp-password")
    expect(serializedLogs).not.toContain(rawToken)
    expect(serializedLogs).not.toContain("raw SMTP response")
  })
})
