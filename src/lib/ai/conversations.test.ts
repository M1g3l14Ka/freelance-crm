import { beforeEach, describe, expect, it, vi } from "vitest"
import { ConversationNotFoundError } from "@/lib/ai/errors"

const mocks = vi.hoisted(() => ({
  conversationFindMany: vi.fn(),
  conversationFindFirst: vi.fn(),
  conversationDeleteMany: vi.fn(),
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    conversation: {
      findMany: mocks.conversationFindMany,
      findFirst: mocks.conversationFindFirst,
      deleteMany: mocks.conversationDeleteMany,
    },
  },
}))

import {
  deleteConversationForUser,
  getConversationForUser,
  listConversationsForUser,
} from "@/lib/ai/conversations"

const conversationId = "cm12345678901234567890123"

describe("AI conversation ownership queries", () => {
  beforeEach(() => vi.clearAllMocks())

  it("lists only owned conversations ordered by recent activity", async () => {
    mocks.conversationFindMany.mockResolvedValue([])

    await listConversationsForUser("user-a")

    expect(mocks.conversationFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { userId: "user-a" },
        orderBy: { updatedAt: "desc" },
        take: 30,
      })
    )
  })

  it("cannot read another user's conversation", async () => {
    mocks.conversationFindFirst.mockResolvedValue(null)

    await expect(getConversationForUser("user-a", conversationId)).rejects.toBeInstanceOf(
      ConversationNotFoundError
    )
    expect(mocks.conversationFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: conversationId, userId: "user-a" } })
    )
  })

  it("cannot delete another user's conversation", async () => {
    mocks.conversationDeleteMany.mockResolvedValue({ count: 0 })

    await expect(
      deleteConversationForUser("user-a", conversationId)
    ).rejects.toBeInstanceOf(ConversationNotFoundError)
    expect(mocks.conversationDeleteMany).toHaveBeenCalledWith({
      where: { id: conversationId, userId: "user-a" },
    })
  })

  it("deletes an owned conversation through its cascade-backed owner filter", async () => {
    mocks.conversationDeleteMany.mockResolvedValue({ count: 1 })

    await expect(
      deleteConversationForUser("user-a", conversationId)
    ).resolves.toBeUndefined()
    expect(mocks.conversationDeleteMany).toHaveBeenCalledWith({
      where: { id: conversationId, userId: "user-a" },
    })
  })
})
