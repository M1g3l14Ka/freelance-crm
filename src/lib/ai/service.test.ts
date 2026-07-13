import { beforeEach, describe, expect, it, vi } from "vitest"
import { MessageRole } from "@prisma/client"
import {
  AiProviderError,
  AiProviderTimeoutError,
  AiRateLimitError,
  ConversationNotFoundError,
} from "@/lib/ai/errors"

const mocks = vi.hoisted(() => ({
  conversationFindFirst: vi.fn(),
  messageCount: vi.fn(),
  projectFindMany: vi.fn(),
  subscriptionFindMany: vi.fn(),
  budgetLimitFindMany: vi.fn(),
  transaction: vi.fn(),
  transactionConversationCreate: vi.fn(),
  transactionConversationUpdate: vi.fn(),
  generateAssistantReply: vi.fn(),
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/ai/provider", () => ({
  generateAssistantReply: mocks.generateAssistantReply,
}))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    conversation: { findFirst: mocks.conversationFindFirst },
    message: { count: mocks.messageCount },
    project: { findMany: mocks.projectFindMany },
    subscription: { findMany: mocks.subscriptionFindMany },
    budgetLimit: { findMany: mocks.budgetLimitFindMany },
    $transaction: mocks.transaction,
  },
}))

import { clearBurstRateLimits } from "@/lib/ai/rate-limit"
import {
  DAILY_SUCCESS_LIMIT,
  selectLatestCompletePairs,
  sendConversationMessage,
} from "@/lib/ai/service"

const conversationId = "cm12345678901234567890123"
const now = new Date("2026-07-13T12:00:00.000Z")

type FinancialContextProject = {
  title: string
  netIncome: number | null
  grossIncome: number
  currency: string
  status: string
}

function storedConversation() {
  return {
    id: conversationId,
    title: "Review my finances",
    createdAt: new Date("2026-07-13T11:00:00.000Z"),
    updatedAt: new Date("2026-07-13T12:00:00.001Z"),
    messages: [
      {
        id: "assistant-message",
        role: MessageRole.ASSISTANT,
        content: "Your finances look stable.",
        createdAt: new Date("2026-07-13T12:00:00.001Z"),
      },
      {
        id: "user-message",
        role: MessageRole.USER,
        content: "Review my finances",
        createdAt: new Date("2026-07-13T12:00:00.000Z"),
      },
    ],
  }
}

async function captureFinancialContext(projects: FinancialContextProject[]) {
  mocks.projectFindMany.mockResolvedValue(projects)
  await sendConversationMessage("user-a", { message: "Review my finances" }, now)

  const providerInput: unknown = mocks.generateAssistantReply.mock.calls[0]?.[0]
  if (
    !providerInput ||
    typeof providerInput !== "object" ||
    !("financialContext" in providerInput) ||
    typeof providerInput.financialContext !== "string"
  ) {
    throw new Error("Expected generated financial context")
  }
  return providerInput.financialContext
}

describe("AI conversation message service", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    clearBurstRateLimits()
    mocks.messageCount.mockResolvedValue(0)
    mocks.projectFindMany.mockResolvedValue([])
    mocks.subscriptionFindMany.mockResolvedValue([])
    mocks.budgetLimitFindMany.mockResolvedValue([])
    mocks.generateAssistantReply.mockResolvedValue("Your finances look stable.")
    mocks.transactionConversationCreate.mockResolvedValue(storedConversation())
    mocks.transactionConversationUpdate.mockResolvedValue(storedConversation())
    mocks.transaction.mockImplementation(async (callback) =>
      callback({
        conversation: {
          create: mocks.transactionConversationCreate,
          update: mocks.transactionConversationUpdate,
        },
      })
    )
  })

  it("creates the first conversation and stores a complete pair transactionally", async () => {
    const result = await sendConversationMessage(
      "user-a",
      { message: "Review my finances" },
      now
    )

    expect(mocks.transaction).toHaveBeenCalledOnce()
    expect(mocks.transactionConversationCreate).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: "user-a",
          title: "Review my finances",
          messages: {
            create: [
              expect.objectContaining({
                role: MessageRole.USER,
                content: "Review my finances",
              }),
              expect.objectContaining({
                role: MessageRole.ASSISTANT,
                content: "Your finances look stable.",
              }),
            ],
          },
        }),
      })
    )
    expect(result.messages.map((message) => message.role)).toEqual([
      MessageRole.USER,
      MessageRole.ASSISTANT,
    ])
    expect(mocks.projectFindMany).toHaveBeenCalledWith(
      expect.objectContaining({ where: { userId: "user-a" } })
    )
  })

  it("sums project net income within the same currency", async () => {
    const financialContext = await captureFinancialContext([
      {
        title: "First USD project",
        netIncome: 1_000,
        grossIncome: 1_100,
        currency: "USD",
        status: "ACTIVE",
      },
      {
        title: "Second USD project",
        netIncome: 500,
        grossIncome: 550,
        currency: "USD",
        status: "COMPLETED",
      },
    ])

    expect(financialContext).toContain("INCOME TOTALS BY CURRENCY:\n- USD: 1,500")
  })

  it("keeps different currencies separate and emits no combined total", async () => {
    const financialContext = await captureFinancialContext([
      {
        title: "Ruble project",
        netIncome: 100_000,
        grossIncome: 110_000,
        currency: "RUB",
        status: "ACTIVE",
      },
      {
        title: "Dollar project",
        netIncome: 1_500,
        grossIncome: 1_600,
        currency: "USD",
        status: "COMPLETED",
      },
      {
        title: "Euro project",
        netIncome: 900,
        grossIncome: 1_000,
        currency: "EUR",
        status: "ACTIVE",
      },
    ])

    expect(financialContext).toContain(
      "INCOME TOTALS BY CURRENCY:\n- EUR: 900\n- RUB: 100,000\n- USD: 1,500"
    )
    expect(financialContext).not.toContain("Total earned")
    expect(financialContext).not.toContain("102,400")
    expect(financialContext).toContain(
      "PROJECTS:\n- Total projects: 3\n- Active: 2\n- Completed: 1"
    )
    expect(financialContext).toContain("RECENT PROJECTS:\n- Ruble project:")
  })

  it("handles an empty project list safely", async () => {
    const financialContext = await captureFinancialContext([])

    expect(financialContext).toContain(
      "PROJECTS:\n- Total projects: 0\n- Active: 0\n- Completed: 0"
    )
    expect(financialContext).toContain(
      "INCOME TOTALS BY CURRENCY:\nNo project income"
    )
    expect(financialContext).toContain("RECENT PROJECTS:\nNo projects")
    expect(financialContext).not.toContain("Total earned")
  })

  it.each([
    [new AiProviderError()],
    [new AiProviderTimeoutError()],
  ])("stores no messages after provider failure %#", async (providerError) => {
    mocks.generateAssistantReply.mockRejectedValue(providerError)

    await expect(
      sendConversationMessage("user-a", { message: "Review my finances" }, now)
    ).rejects.toBe(providerError)
    expect(mocks.transaction).not.toHaveBeenCalled()
    expect(mocks.transactionConversationCreate).not.toHaveBeenCalled()
    expect(mocks.transactionConversationUpdate).not.toHaveBeenCalled()
  })

  it("does not append to a foreign or missing conversation", async () => {
    mocks.conversationFindFirst.mockResolvedValue(null)

    await expect(
      sendConversationMessage(
        "user-a",
        { message: "Continue", conversationId },
        now
      )
    ).rejects.toBeInstanceOf(ConversationNotFoundError)
    expect(mocks.conversationFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: conversationId, userId: "user-a" } })
    )
    expect(mocks.generateAssistantReply).not.toHaveBeenCalled()
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it("owner-qualifies the final update when appending messages", async () => {
    mocks.conversationFindFirst.mockResolvedValue({ id: conversationId, messages: [] })

    await sendConversationMessage(
      "user-a",
      { message: "Continue", conversationId },
      now
    )

    expect(mocks.transactionConversationUpdate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: conversationId, userId: "user-a" },
        data: expect.objectContaining({
          messages: {
            create: [
              expect.objectContaining({ role: MessageRole.USER }),
              expect.objectContaining({ role: MessageRole.ASSISTANT }),
            ],
          },
        }),
      })
    )
  })

  it("sends only the latest five complete pairs in chronological order", async () => {
    const chronologicalHistory = Array.from({ length: 7 }, (_, index) => [
      {
        role: MessageRole.USER,
        content: `user-${index + 1}`,
        createdAt: new Date(index * 2),
      },
      {
        role: MessageRole.ASSISTANT,
        content: `assistant-${index + 1}`,
        createdAt: new Date(index * 2 + 1),
      },
    ]).flat()

    mocks.conversationFindFirst.mockResolvedValue({
      id: conversationId,
      messages: [...chronologicalHistory].reverse(),
    })

    await sendConversationMessage(
      "user-a",
      { message: "Current question", conversationId },
      now
    )

    expect(mocks.generateAssistantReply).toHaveBeenCalledWith(
      expect.objectContaining({
        currentMessage: "Current question",
        history: [3, 4, 5, 6, 7].map((number) => ({
          user: `user-${number}`,
          assistant: `assistant-${number}`,
        })),
      })
    )
  })

  it("ignores incomplete rows while selecting complete context pairs", () => {
    const messages = [
      { role: MessageRole.ASSISTANT, content: "orphan", createdAt: new Date(0) },
      { role: MessageRole.USER, content: "replaced", createdAt: new Date(1) },
      { role: MessageRole.USER, content: "paired", createdAt: new Date(2) },
      { role: MessageRole.ASSISTANT, content: "answer", createdAt: new Date(3) },
      { role: MessageRole.USER, content: "dangling", createdAt: new Date(4) },
    ]

    expect(selectLatestCompletePairs(messages)).toEqual([
      { user: "paired", assistant: "answer" },
    ])
  })

  it("rejects the persistent daily successful-message limit before provider work", async () => {
    mocks.messageCount.mockResolvedValue(DAILY_SUCCESS_LIMIT)

    await expect(
      sendConversationMessage("user-a", { message: "Review my finances" }, now)
    ).rejects.toBeInstanceOf(AiRateLimitError)
    expect(mocks.messageCount).toHaveBeenCalledWith({
      where: expect.objectContaining({
        role: MessageRole.USER,
        conversation: { userId: "user-a" },
      }),
    })
    expect(mocks.generateAssistantReply).not.toHaveBeenCalled()
    expect(mocks.transaction).not.toHaveBeenCalled()
  })

  it("counts failed provider attempts toward the burst limit", async () => {
    mocks.generateAssistantReply.mockRejectedValue(new AiProviderError())

    for (let attempt = 0; attempt < 5; attempt += 1) {
      await expect(
        sendConversationMessage(
          "user-a",
          { message: `Attempt ${attempt}` },
          new Date(now.getTime() + attempt)
        )
      ).rejects.toBeInstanceOf(AiProviderError)
    }

    await expect(
      sendConversationMessage("user-a", { message: "Sixth attempt" }, now)
    ).rejects.toBeInstanceOf(AiRateLimitError)
    expect(mocks.generateAssistantReply).toHaveBeenCalledTimes(5)
  })
})
