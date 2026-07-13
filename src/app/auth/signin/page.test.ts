import { readFileSync } from "node:fs"
import { describe, expect, it } from "vitest"

describe("sign-in page password recovery", () => {
  it("contains the public forgot-password link", () => {
    const source = readFileSync(new URL("./page.tsx", import.meta.url), "utf8")

    expect(source).toContain('href="/forgot-password"')
    expect(source).toContain("Forgot password?")
  })
})
