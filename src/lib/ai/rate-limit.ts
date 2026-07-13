import "server-only"

import { AiRateLimitError } from "@/lib/ai/errors"

const BURST_WINDOW_MS = 60_000
const BURST_LIMIT = 5

const attemptsByUser = new Map<string, number[]>()

export function enforceBurstRateLimit(userId: string, now = Date.now()) {
  const cutoff = now - BURST_WINDOW_MS
  const recentAttempts = (attemptsByUser.get(userId) ?? []).filter(
    (attempt) => attempt > cutoff
  )

  if (recentAttempts.length >= BURST_LIMIT) {
    attemptsByUser.set(userId, recentAttempts)
    throw new AiRateLimitError("Too many assistant requests. Try again in a minute.")
  }

  attemptsByUser.set(userId, [...recentAttempts, now])
}

export function clearBurstRateLimits() {
  attemptsByUser.clear()
}
