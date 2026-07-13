import { describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import {
  createConversationTitle,
  MAX_TITLE_LENGTH,
  parseAiRequestBody,
} from "@/lib/ai/validation"

describe("AI request validation", () => {
  it("trims valid messages and rejects blank or oversized messages", () => {
    expect(parseAiRequestBody({ message: "  hello  " })).toEqual({ message: "hello" })
    expect(() => parseAiRequestBody({ message: " \n " })).toThrow("cannot be empty")
    expect(() => parseAiRequestBody({ message: "x".repeat(2_001) })).toThrow(
      "2,000 characters"
    )
  })

  it("generates deterministic normalized and length-limited titles", () => {
    const source = `  Review\n\nmy    very long financial plan ${"x".repeat(100)}  `
    const first = createConversationTitle(source)

    expect(first).toBe(createConversationTitle(source))
    expect(first).not.toContain("\n")
    expect(first).not.toContain("  ")
    expect(first.length).toBeLessThanOrEqual(MAX_TITLE_LENGTH)
    expect(first.endsWith("...")).toBe(true)
  })
})
