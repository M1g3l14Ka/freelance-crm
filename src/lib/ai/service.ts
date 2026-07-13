import "server-only"

import { MessageRole } from "@prisma/client"
import { AiRateLimitError, ConversationNotFoundError } from "@/lib/ai/errors"
import { enforceBurstRateLimit } from "@/lib/ai/rate-limit"
import {
  generateAssistantReply,
  type ConversationPair,
} from "@/lib/ai/provider"
import { createConversationTitle, type ValidatedAiRequest } from "@/lib/ai/validation"
import { prisma } from "@/lib/prisma"

export const DAILY_SUCCESS_LIMIT = 50
const HISTORY_QUERY_LIMIT = 30

type StoredHistoryMessage = {
  role: MessageRole
  content: string
  createdAt: Date
}

export function selectLatestCompletePairs(
  messages: StoredHistoryMessage[],
  limit = 5
): ConversationPair[] {
  const pairs: ConversationPair[] = []
  let pendingUserMessage: string | null = null

  for (const message of messages) {
    if (message.role === MessageRole.USER) {
      pendingUserMessage = message.content
    } else if (message.role === MessageRole.ASSISTANT && pendingUserMessage !== null) {
      pairs.push({ user: pendingUserMessage, assistant: message.content })
      pendingUserMessage = null
    }
  }

  return pairs.slice(-limit)
}

function utcDayRange(now: Date) {
  const start = new Date(now)
  start.setUTCHours(0, 0, 0, 0)
  return { start, end: new Date(start.getTime() + 86_400_000) }
}

async function buildFinancialContext(userId: string) {
  const [projects, subscriptions, budgetLimits] = await Promise.all([
    prisma.project.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
    }),
    prisma.subscription.findMany({ where: { userId } }),
    prisma.budgetLimit.findMany({ where: { userId } }),
  ])

  const incomeTotalsByCurrency = new Map<string, number>()
  for (const project of projects) {
    incomeTotalsByCurrency.set(
      project.currency,
      (incomeTotalsByCurrency.get(project.currency) ?? 0) + (project.netIncome ?? 0)
    )
  }
  const incomeTotals = [...incomeTotalsByCurrency.entries()]
    .sort(([leftCurrency], [rightCurrency]) =>
      leftCurrency < rightCurrency ? -1 : leftCurrency > rightCurrency ? 1 : 0
    )
    .map(
      ([currency, total]) => `- ${currency}: ${total.toLocaleString("en-US")}`
    )
    .join("\n")
  const activeProjects = projects.filter((project) => project.status === "ACTIVE").length
  const completedProjects = projects.filter(
    (project) => project.status === "COMPLETED"
  ).length

  return `User financial data:

PROJECTS:
- Total projects: ${projects.length}
- Active: ${activeProjects}
- Completed: ${completedProjects}

INCOME TOTALS BY CURRENCY:
${incomeTotals || "No project income"}

RECENT PROJECTS:
${
  projects.length
    ? projects
        .slice(0, 5)
        .map(
          (project) =>
            `- ${project.title}: ${project.grossIncome.toLocaleString("en-US")} (${project.currency}), status: ${project.status}`
        )
        .join("\n")
    : "No projects"
}

SUBSCRIPTIONS:
${
  subscriptions.length
    ? subscriptions
        .map(
          (subscription) =>
            `- ${subscription.title}: ${subscription.amount.toLocaleString("en-US")} ${subscription.currency}, next payment: ${subscription.nextPaymentDate.toLocaleDateString("en-US")}`
        )
        .join("\n")
    : "No active subscriptions"
}

BUDGET LIMITS:
${
  budgetLimits.length
    ? budgetLimits
        .map(
          (budget) =>
            `- ${budget.period} (${budget.month ?? ""}/${budget.year ?? ""}): limit ${budget.limitAmount.toLocaleString("en-US")} ${budget.currency}, spent ${budget.spentAmount.toLocaleString("en-US")} ${budget.currency}`
        )
        .join("\n")
    : "No limits set"
}

Current date: ${new Date().toLocaleDateString("en-US")}`
}

const persistedConversationSelect = {
  id: true,
  title: true,
  createdAt: true,
  updatedAt: true,
  messages: {
    orderBy: { createdAt: "desc" as const },
    take: 2,
    select: {
      id: true,
      role: true,
      content: true,
      createdAt: true,
    },
  },
} as const

export async function sendConversationMessage(
  userId: string,
  input: ValidatedAiRequest,
  now = new Date()
) {
  enforceBurstRateLimit(userId, now.getTime())

  let history: ConversationPair[] = []
  if (input.conversationId) {
    const ownedConversation = await prisma.conversation.findFirst({
      where: { id: input.conversationId, userId },
      select: {
        id: true,
        messages: {
          orderBy: { createdAt: "desc" },
          take: HISTORY_QUERY_LIMIT,
          select: { role: true, content: true, createdAt: true },
        },
      },
    })

    if (!ownedConversation) throw new ConversationNotFoundError()
    history = selectLatestCompletePairs([...ownedConversation.messages].reverse())
  }

  const { start, end } = utcDayRange(now)
  const successfulMessagesToday = await prisma.message.count({
    where: {
      role: MessageRole.USER,
      createdAt: { gte: start, lt: end },
      conversation: { userId },
    },
  })
  if (successfulMessagesToday >= DAILY_SUCCESS_LIMIT) {
    throw new AiRateLimitError("Daily assistant message limit reached. Try again tomorrow.")
  }

  const financialContext = await buildFinancialContext(userId)
  const assistantContent = await generateAssistantReply({
    financialContext,
    history,
    currentMessage: input.message,
  })

  const userCreatedAt = new Date(Math.max(now.getTime(), Date.now()))
  const assistantCreatedAt = new Date(userCreatedAt.getTime() + 1)

  const conversation = await prisma.$transaction(async (transaction) => {
    const messages = {
      create: [
        {
          role: MessageRole.USER,
          content: input.message,
          createdAt: userCreatedAt,
        },
        {
          role: MessageRole.ASSISTANT,
          content: assistantContent,
          createdAt: assistantCreatedAt,
        },
      ],
    }

    if (input.conversationId) {
      return transaction.conversation.update({
        where: { id: input.conversationId, userId },
        data: { updatedAt: assistantCreatedAt, messages },
        select: persistedConversationSelect,
      })
    }

    return transaction.conversation.create({
      data: {
        userId,
        title: createConversationTitle(input.message),
        updatedAt: assistantCreatedAt,
        messages,
      },
      select: persistedConversationSelect,
    })
  })

  return {
    ...conversation,
    messages: [...conversation.messages].reverse(),
  }
}
