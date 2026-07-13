import "server-only"

import nodemailer, { type Transporter } from "nodemailer"

const CONNECTION_TIMEOUT_MS = 10_000
const GREETING_TIMEOUT_MS = 10_000
const SOCKET_TIMEOUT_MS = 20_000
const DNS_TIMEOUT_MS = 10_000

type SmtpConfiguration = {
  host: string
  port: number
  secure: boolean
  user: string
  pass: string
  from: string
}

let transporter: Transporter | null = null

export class PasswordResetEmailError extends Error {
  constructor() {
    super("Password reset email is temporarily unavailable")
    this.name = "PasswordResetEmailError"
  }
}

function requiredEnvironmentValue(name: string): string {
  const value = process.env[name]?.trim()
  if (!value) throw new PasswordResetEmailError()
  return value
}

function parseAppUrl(value: string): URL {
  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new PasswordResetEmailError()
  }

  const isLocalhost = ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)
  const allowsLocalHttp =
    process.env.NODE_ENV !== "production" && isLocalhost && url.protocol === "http:"

  if (
    (url.protocol !== "https:" && !allowsLocalHttp) ||
    url.username ||
    url.password ||
    url.search ||
    url.hash
  ) {
    throw new PasswordResetEmailError()
  }

  return url
}

function loadSmtpConfiguration(): SmtpConfiguration {
  const portValue = requiredEnvironmentValue("SMTP_PORT")
  const port = Number(portValue)
  if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new PasswordResetEmailError()
  }

  const secureValue = requiredEnvironmentValue("SMTP_SECURE")
  if (secureValue !== "true" && secureValue !== "false") {
    throw new PasswordResetEmailError()
  }

  return {
    host: requiredEnvironmentValue("SMTP_HOST"),
    port,
    secure: secureValue === "true",
    user: requiredEnvironmentValue("SMTP_USER"),
    pass: requiredEnvironmentValue("SMTP_PASS"),
    from: requiredEnvironmentValue("SMTP_FROM"),
  }
}

function getTransporter(configuration: SmtpConfiguration) {
  if (transporter) return transporter

  transporter = nodemailer.createTransport({
    host: configuration.host,
    port: configuration.port,
    secure: configuration.secure,
    requireTLS: !configuration.secure,
    auth: {
      user: configuration.user,
      pass: configuration.pass,
    },
    connectionTimeout: CONNECTION_TIMEOUT_MS,
    greetingTimeout: GREETING_TIMEOUT_MS,
    socketTimeout: SOCKET_TIMEOUT_MS,
    dnsTimeout: DNS_TIMEOUT_MS,
    disableFileAccess: true,
    disableUrlAccess: true,
    logger: false,
    debug: false,
  })
  return transporter
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
}

export function buildPasswordResetUrl(token: string) {
  const appUrl = parseAppUrl(requiredEnvironmentValue("APP_URL"))
  const resetUrl = new URL("/reset-password", appUrl)
  resetUrl.searchParams.set("token", token)
  return resetUrl.toString()
}

export async function sendPasswordResetEmail({
  email,
  resetUrl,
}: {
  email: string
  resetUrl: string
}) {
  try {
    const configuration = loadSmtpConfiguration()
    const mailTransporter = getTransporter(configuration)
    const safeResetUrl = escapeHtml(resetUrl)

    await mailTransporter.sendMail({
      from: configuration.from,
      to: email,
      subject: "Reset your MKFox CRM password",
      text: `A password reset was requested for your MKFox CRM account.\n\nReset your password: ${resetUrl}\n\nThis link expires in 30 minutes. If you did not make this request, you can ignore this email.`,
      html: `<p>A password reset was requested for your MKFox CRM account.</p><p><a href="${safeResetUrl}">Reset your password</a></p><p>This link expires in 30 minutes. If you did not make this request, you can ignore this email.</p>`,
    })
  } catch (error) {
    console.error("Password reset email delivery failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    })
    throw new PasswordResetEmailError()
  }
}

export function resetPasswordResetEmailTransportForTests() {
  transporter = null
}
