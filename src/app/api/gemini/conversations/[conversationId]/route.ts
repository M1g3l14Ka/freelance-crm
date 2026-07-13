import { revalidatePath } from "next/cache"
import { NextResponse } from "next/server"
import type { AiErrorResponse } from "@/features/ai/types"
import {
  AiValidationError,
  ConversationNotFoundError,
} from "@/lib/ai/errors"
import { deleteConversationForUser } from "@/lib/ai/conversations"
import { isConversationId } from "@/lib/ai/validation"
import {
  AuthenticationRequiredError,
  requireWritableUser,
} from "@/lib/auth-guard"
import { ReadOnlyDemoError } from "@/lib/demo"

function errorResponse(error: string, code: string, status: number) {
  return NextResponse.json<AiErrorResponse>({ error, code }, { status })
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ conversationId: string }> }
) {
  try {
    const user = await requireWritableUser()
    const { conversationId } = await params
    if (!isConversationId(conversationId)) {
      throw new AiValidationError("Conversation ID is invalid")
    }

    await deleteConversationForUser(user.id, conversationId)
    revalidatePath("/dashboard/assistant")
    return NextResponse.json({ success: true })
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

    console.error("Delete AI conversation failed:", error)
    return errorResponse("Unable to delete conversation", "AI_INTERNAL_ERROR", 500)
  }
}
