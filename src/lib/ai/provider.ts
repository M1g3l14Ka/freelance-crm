import "server-only"

import { AiProviderError, AiProviderTimeoutError } from "@/lib/ai/errors"

const GEMINI_API_URL =
  "https://generativelanguage.googleapis.com/v1beta/models/gemini-3.5-flash:generateContent"
const GEMINI_TIMEOUT_MS = 25_000

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

  try {
    const response = await fetch(GEMINI_API_URL, {
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

    if (!response.ok) {
      console.error("Gemini provider returned an error status", {
        status: response.status,
      })
      throw new AiProviderError()
    }

    const answer = extractAnswer(await response.json())
    if (!answer) {
      console.error("Gemini provider returned an invalid response shape")
      throw new AiProviderError()
    }

    return answer
  } catch (error) {
    if (controller.signal.aborted) {
      console.error("Gemini request timed out after 25 seconds")
      throw new AiProviderTimeoutError()
    }
    if (error instanceof AiProviderError) throw error

    console.error("Gemini request failed", {
      errorType: error instanceof Error ? error.name : "UnknownError",
    })
    throw new AiProviderError()
  } finally {
    clearTimeout(timeout)
  }
}
