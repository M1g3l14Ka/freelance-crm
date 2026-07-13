import "server-only"

import { ConversationNotFoundError } from "@/lib/ai/errors"
import { prisma } from "@/lib/prisma"

const CONVERSATION_LIST_LIMIT = 30

export async function listConversationsForUser(userId: string) {
  return prisma.conversation.findMany({
    where: { userId },
    orderBy: { updatedAt: "desc" },
    take: CONVERSATION_LIST_LIMIT,
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
    },
  })
}

export async function getConversationForUser(userId: string, conversationId: string) {
  const conversation = await prisma.conversation.findFirst({
    where: { id: conversationId, userId },
    select: {
      id: true,
      title: true,
      createdAt: true,
      updatedAt: true,
      messages: {
        orderBy: { createdAt: "asc" },
        select: {
          id: true,
          role: true,
          content: true,
          createdAt: true,
        },
      },
    },
  })

  if (!conversation) throw new ConversationNotFoundError()
  return conversation
}

export async function deleteConversationForUser(userId: string, conversationId: string) {
  const result = await prisma.conversation.deleteMany({
    where: { id: conversationId, userId },
  })

  if (result.count !== 1) throw new ConversationNotFoundError()
}
