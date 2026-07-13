import "server-only"

export class AiValidationError extends Error {
  readonly code = "AI_VALIDATION_ERROR"

  constructor(message: string) {
    super(message)
    this.name = "AiValidationError"
  }
}

export class ConversationNotFoundError extends Error {
  readonly code = "CONVERSATION_NOT_FOUND"

  constructor() {
    super("Conversation not found")
    this.name = "ConversationNotFoundError"
  }
}

export class AiRateLimitError extends Error {
  readonly code = "AI_RATE_LIMITED"

  constructor(message: string) {
    super(message)
    this.name = "AiRateLimitError"
  }
}

export class AiProviderTimeoutError extends Error {
  readonly code = "AI_PROVIDER_TIMEOUT"

  constructor() {
    super("The assistant timed out. Please try again.")
    this.name = "AiProviderTimeoutError"
  }
}

export class AiProviderError extends Error {
  readonly code = "AI_PROVIDER_ERROR"

  constructor() {
    super("The assistant is temporarily unavailable. Please try again.")
    this.name = "AiProviderError"
  }
}
