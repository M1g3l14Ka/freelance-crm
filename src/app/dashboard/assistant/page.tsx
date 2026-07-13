import { notFound } from "next/navigation"
import { AIAnalytics } from "@/widgets/AIAnalytics"
import type {
  ConversationSummary,
  SelectedConversation,
} from "@/features/ai/types"
import {
  getConversationForUser,
  listConversationsForUser,
} from "@/lib/ai/conversations"
import { ConversationNotFoundError } from "@/lib/ai/errors"
import { isConversationId } from "@/lib/ai/validation"
import { getDashboardContext } from "@/lib/dashboard"
import { serializeUtcTimestamp } from "@/lib/date-format"

type AssistantPageProps = {
  searchParams: Promise<{ conversation?: string | string[] }>
}

export default async function AssistantPage({ searchParams }: AssistantPageProps) {
  const { user, isDemo } = await getDashboardContext()
  const selectedParam = (await searchParams).conversation

  if (isDemo) {
    return (
      <>
        <div>
          <h1 className="app-page-title">Financial assistant</h1>
          <p className="app-page-description">
            Ask Gemini for insights about your current CRM data.
          </p>
        </div>
        <AIAnalytics readOnly conversations={[]} />
      </>
    )
  }

  if (Array.isArray(selectedParam) || (selectedParam && !isConversationId(selectedParam))) {
    notFound()
  }

  const conversations = await listConversationsForUser(user.id)
  let selectedConversation: Awaited<ReturnType<typeof getConversationForUser>> | null = null

  if (selectedParam) {
    try {
      selectedConversation = await getConversationForUser(user.id, selectedParam)
    } catch (error) {
      if (error instanceof ConversationNotFoundError) notFound()
      throw error
    }
  }

  const serializedConversations: ConversationSummary[] = conversations.map(
    (conversation) => ({
      ...conversation,
      createdAt: serializeUtcTimestamp(conversation.createdAt),
      updatedAt: serializeUtcTimestamp(conversation.updatedAt),
    })
  )

  const serializedSelected: SelectedConversation | undefined = selectedConversation
    ? {
        id: selectedConversation.id,
        title: selectedConversation.title,
        createdAt: serializeUtcTimestamp(selectedConversation.createdAt),
        updatedAt: serializeUtcTimestamp(selectedConversation.updatedAt),
        messages: selectedConversation.messages.map((message) => ({
          id: message.id,
          role: message.role,
          content: message.content,
          createdAt: serializeUtcTimestamp(message.createdAt),
        })),
      }
    : undefined

  return (
    <>
      <div>
        <h1 className="app-page-title">Financial assistant</h1>
        <p className="app-page-description">
          Persistent conversations grounded in your current CRM data.
        </p>
      </div>
      <AIAnalytics
        key={serializedSelected?.id ?? "new-conversation"}
        conversations={serializedConversations}
        selectedConversation={serializedSelected}
      />
    </>
  )
}
