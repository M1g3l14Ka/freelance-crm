import "server-only"

import { AiValidationError } from "@/lib/ai/errors"

export const MAX_MESSAGE_LENGTH = 2_000
export const MAX_TITLE_LENGTH = 64

const CONVERSATION_ID_PATTERN = /^c[a-z0-9]{24,31}$/
const ALLOWED_REQUEST_FIELDS = new Set(["message", "conversationId"])

export type ValidatedAiRequest = {
  message: string
  conversationId?: string
}

export function isConversationId(value: unknown): value is string {
  return typeof value === "string" && CONVERSATION_ID_PATTERN.test(value)
}

export function parseAiRequestBody(value: unknown): ValidatedAiRequest {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new AiValidationError("Request body must be a JSON object")
  }

  const body = value as Record<string, unknown>
  if (Object.keys(body).some((key) => !ALLOWED_REQUEST_FIELDS.has(key))) {
    throw new AiValidationError("Request contains unknown fields")
  }

  if (typeof body.message !== "string") {
    throw new AiValidationError("Message must be a string")
  }

  const message = body.message.trim()
  if (!message) {
    throw new AiValidationError("Message cannot be empty")
  }
  if (message.length > MAX_MESSAGE_LENGTH) {
    throw new AiValidationError(
      `Message must be ${MAX_MESSAGE_LENGTH.toLocaleString("en-US")} characters or fewer`
    )
  }

  if (body.conversationId !== undefined && !isConversationId(body.conversationId)) {
    throw new AiValidationError("Conversation ID is invalid")
  }

  return {
    message,
    ...(typeof body.conversationId === "string"
      ? { conversationId: body.conversationId }
      : {}),
  }
}

export function createConversationTitle(message: string): string {
  const normalized = message.trim().replace(/\s+/g, " ")
  if (normalized.length <= MAX_TITLE_LENGTH) return normalized
  return `${normalized.slice(0, MAX_TITLE_LENGTH - 3).trimEnd()}...`
}
