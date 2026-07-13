import "server-only"

import { AiProviderError, AiProviderTimeoutError } from "@/lib/ai/errors"

const GEMINI_API_BASE_URL =
  "https://generativelanguage.googleapis.com/v1beta/models"
const DEFAULT_GEMINI_MODEL = "gemini-3-flash-preview"
const GEMINI_TIMEOUT_MS = 25_000
const MAX_ATTEMPTS = 3
const RETRY_DELAYS_MS = [750, 1_500] as const
const RETRY_JITTER_MS = 250
const RETRYABLE_HTTP_STATUSES = new Set([408, 429, 500, 502, 503, 504])

export type ConversationPair = {
  user: string
  assistant: string
}

type GenerateAssistantReplyInput = {
  financialContext: string
  history: ConversationPair[]
  currentMessage: string
}

function extractAnswer(value: unknown): string | null {
  if (!value || typeof value !== "object") return null
  const candidates = (value as { candidates?: unknown }).candidates
  if (!Array.isArray(candidates)) return null

  const textParts: string[] = []
  for (const candidate of candidates) {
    if (!candidate || typeof candidate !== "object") continue
    const content = (candidate as { content?: unknown }).content
    if (!content || typeof content !== "object") continue
    const parts = (content as { parts?: unknown }).parts
    if (!Array.isArray(parts)) continue

    for (const part of parts) {
      if (!part || typeof part !== "object") continue
      const text = (part as { text?: unknown }).text
      if (typeof text === "string" && text.trim()) {
        textParts.push(text.trim())
      }
    }
  }

  return textParts.length ? textParts.join("\n") : null
}

function getGeminiApiUrl() {
  const model = process.env.GEMINI_MODEL?.trim() || DEFAULT_GEMINI_MODEL
  return `${GEMINI_API_BASE_URL}/${encodeURIComponent(model)}:generateContent`
}

function waitForRetry(delayMs: number, signal: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal.aborted) {
      reject(signal.reason)
      return
    }

    const timeout = setTimeout(() => {
      signal.removeEventListener("abort", handleAbort)
      resolve()
    }, delayMs)
    const handleAbort = () => {
      clearTimeout(timeout)
      reject(signal.reason)
    }

    signal.addEventListener("abort", handleAbort, { once: true })
  })
}

function retryDelay(attempt: number): number {
  const baseDelay = RETRY_DELAYS_MS[attempt - 1]
  if (baseDelay === undefined) return 0
  return baseDelay + Math.floor(Math.random() * (RETRY_JITTER_MS + 1))
}

function logAttemptFailure({
  attempt,
  status,
  failure,
  willRetry,
}: {
  attempt: number
  status: number | null
  failure: "http" | "network" | "invalid_response"
  willRetry: boolean
}) {
  console.error("Gemini provider attempt failed", {
    attempt,
    status,
    failure,
    willRetry,
  })
}

export async function generateAssistantReply({
  financialContext,
  history,
  currentMessage,
}: GenerateAssistantReplyInput): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY
  if (!apiKey) {
    console.error("Gemini request skipped: API key is not configured")
    throw new AiProviderError()
  }

  const controller = new AbortController()
  const timeout = setTimeout(() => controller.abort(), GEMINI_TIMEOUT_MS)
  let currentAttempt = 0

  try {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
      currentAttempt = attempt
      let response: Response

      try {
        response = await fetch(getGeminiApiUrl(), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-goog-api-key": apiKey,
          },
          signal: controller.signal,
          body: JSON.stringify({
            systemInstruction: {
              parts: [
                {
                  text: `${financialContext}\n\nYou are a financial assistant for a freelance CRM. Answer in English with concise, practical analysis and recommendations. Use only the supplied financial and conversation context.`,
                },
              ],
            },
            contents: [
              ...history.flatMap((pair) => [
                { role: "user", parts: [{ text: pair.user }] },
                { role: "model", parts: [{ text: pair.assistant }] },
              ]),
              { role: "user", parts: [{ text: currentMessage }] },
            ],
            generationConfig: {
              maxOutputTokens: 2048,
            },
          }),
        })
      } catch {
        if (controller.signal.aborted) {
          throw controller.signal.reason
        }

        const willRetry = attempt < MAX_ATTEMPTS
        logAttemptFailure({ attempt, status: null, failure: "network", willRetry })
        if (!willRetry) {
          console.error("Gemini provider request failed after retries", {
            attempts: attempt,
            status: null,
          })
          throw new AiProviderError()
        }

        await waitForRetry(retryDelay(attempt), controller.signal)
        continue
      }

      if (!response.ok) {
        const willRetry =
          attempt < MAX_ATTEMPTS && RETRYABLE_HTTP_STATUSES.has(response.status)
        logAttemptFailure({
          attempt,
          status: response.status,
          failure: "http",
          willRetry,
        })

        if (!willRetry) {
          console.error("Gemini provider request failed", {
            attempts: attempt,
            status: response.status,
          })
          throw new AiProviderError()
        }

        await waitForRetry(retryDelay(attempt), controller.signal)
        continue
      }

      let responseBody: unknown
      try {
        responseBody = await response.json()
      } catch {
        if (controller.signal.aborted) {
          throw controller.signal.reason
        }
        logAttemptFailure({
          attempt,
          status: response.status,
          failure: "invalid_response",
          willRetry: false,
        })
        console.error("Gemini provider request failed", {
          attempts: attempt,
          status: response.status,
        })
        throw new AiProviderError()
      }

      const answer = extractAnswer(responseBody)
      if (controller.signal.aborted) {
        throw controller.signal.reason
      }
      if (!answer) {
        logAttemptFailure({
          attempt,
          status: response.status,
          failure: "invalid_response",
          willRetry: false,
        })
        console.error("Gemini provider request failed", {
          attempts: attempt,
          status: response.status,
        })
        throw new AiProviderError()
      }

      return answer
    }

    throw new AiProviderError()
  } catch (error) {
    if (controller.signal.aborted) {
      console.error("Gemini provider request reached its overall deadline", {
        attempt: currentAttempt,
      })
      throw new AiProviderTimeoutError()
    }
    if (error instanceof AiProviderError || error instanceof AiProviderTimeoutError) {
      throw error
    }

    console.error("Gemini provider request failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    })
    throw new AiProviderError()
  } finally {
    clearTimeout(timeout)
  }
}
