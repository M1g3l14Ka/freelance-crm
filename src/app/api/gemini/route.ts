import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"
import type { AiErrorResponse } from "@/features/ai/types"
import {
  AiProviderError,
  AiProviderTimeoutError,
  AiRateLimitError,
  AiValidationError,
  ConversationNotFoundError,
} from "@/lib/ai/errors"
import { sendConversationMessage } from "@/lib/ai/service"
import { parseAiRequestBody } from "@/lib/ai/validation"
import {
  AuthenticationRequiredError,
  requireWritableUser,
} from "@/lib/auth-guard"
import { ReadOnlyDemoError } from "@/lib/demo"

function errorResponse(error: string, code: string, status: number) {
  return NextResponse.json<AiErrorResponse>({ error, code }, { status })
}

export async function POST(request: Request) {
  try {
    const user = await requireWritableUser()

    let requestBody: unknown
    try {
      requestBody = await request.json()
    } catch {
      throw new AiValidationError("Request body must be valid JSON")
    }

    const input = parseAiRequestBody(requestBody)
    const result = await sendConversationMessage(user.id, input)
    revalidatePath("/dashboard/assistant")

    return NextResponse.json({
      conversation: {
        id: result.id,
        title: result.title,
        createdAt: result.createdAt.toISOString(),
        updatedAt: result.updatedAt.toISOString(),
      },
      messages: result.messages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        createdAt: message.createdAt.toISOString(),
      })),
    })
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      return errorResponse("Unauthorized", error.code, 401)
    }
    if (error instanceof ReadOnlyDemoError) {
      return errorResponse(
        "AI requests are disabled in the public demo",
        error.code,
        403
      )
    }
    if (error instanceof AiValidationError) {
      return errorResponse(error.message, error.code, 400)
    }
    if (error instanceof ConversationNotFoundError) {
      return errorResponse(error.message, error.code, 404)
    }
    if (error instanceof AiRateLimitError) {
      return errorResponse(error.message, error.code, 429)
    }
    if (error instanceof AiProviderTimeoutError) {
      return errorResponse(error.message, error.code, 504)
    }
    if (error instanceof AiProviderError) {
      return errorResponse(error.message, error.code, 503)
    }

    console.error("AI conversation request failed:", error)
    return errorResponse("Unable to complete assistant request", "AI_INTERNAL_ERROR", 500)
  }
}
