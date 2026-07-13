import { beforeEach, describe, expect, it, vi } from "vitest"

vi.mock("server-only", () => ({}))

import {
  clearBurstRateLimits,
  enforceBurstRateLimit,
} from "@/lib/ai/rate-limit"
import { AiRateLimitError } from "@/lib/ai/errors"

describe("AI burst rate limit", () => {
  beforeEach(() => clearBurstRateLimits())

  it("allows five attempts per user per minute and rejects the sixth", () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      expect(() => enforceBurstRateLimit("user-a", 10_000 + attempt)).not.toThrow()
    }

    expect(() => enforceBurstRateLimit("user-a", 10_100)).toThrow(AiRateLimitError)
    expect(() => enforceBurstRateLimit("user-b", 10_100)).not.toThrow()
  })

  it("forgets attempts after the one-minute window", () => {
    for (let attempt = 0; attempt < 5; attempt += 1) {
      enforceBurstRateLimit("user-a", attempt)
    }

    expect(() => enforceBurstRateLimit("user-a", 60_001)).not.toThrow()
  })
})
