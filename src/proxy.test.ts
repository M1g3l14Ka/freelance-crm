import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  auth: vi.fn((handler: unknown) => handler),
}))

vi.mock("@/lib/auth", () => ({ auth: mocks.auth }))

import { proxy } from "./proxy"

type ProxyRequest = {
  auth: null
  nextUrl: { pathname: string }
  url: string
}

async function request(pathname: string) {
  const handler = proxy as unknown as (
    requestValue: ProxyRequest
  ) => Response | undefined | Promise<Response | undefined>
  return handler({
    auth: null,
    nextUrl: { pathname },
    url: `https://crm.mkfox.test${pathname}`,
  })
}

describe("password reset proxy access", () => {
  beforeEach(() => vi.clearAllMocks())

  it.each(["/forgot-password", "/reset-password"])(
    "allows unauthenticated access to %s",
    async (pathname) => {
      await expect(request(pathname)).resolves.toBeUndefined()
    }
  )

  it.each(["/dashboard", "/forgot-password-archive", "/reset-password/admin"])(
    "keeps non-public route %s protected",
    async (pathname) => {
      const response = await request(pathname)
      expect(response?.status).toBe(302)
      expect(response?.headers.get("location")).toBe(
        "https://crm.mkfox.test/auth/signin"
      )
    }
  )
})
