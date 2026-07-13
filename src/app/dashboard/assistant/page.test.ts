import {
  Children,
  isValidElement,
  type ReactElement,
  type ReactNode,
} from "react"
import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  getDashboardContext: vi.fn(),
  listConversationsForUser: vi.fn(),
  getConversationForUser: vi.fn(),
  notFound: vi.fn(),
}))

vi.mock("@/lib/dashboard", () => ({
  getDashboardContext: mocks.getDashboardContext,
}))
vi.mock("server-only", () => ({}))
vi.mock("@/lib/ai/conversations", () => ({
  listConversationsForUser: mocks.listConversationsForUser,
  getConversationForUser: mocks.getConversationForUser,
}))
vi.mock("next/navigation", () => ({ notFound: mocks.notFound }))
vi.mock("@/widgets/AIAnalytics", () => ({ AIAnalytics: () => null }))

import AssistantPage from "./page"

function findAnalyticsElement(value: unknown): ReactElement | null {
  if (!isValidElement(value)) return null
  const props = value.props as { conversations?: unknown; children?: unknown }
  if (Array.isArray(props.conversations)) return value

  for (const child of Children.toArray(props.children as ReactNode)) {
    const match = findAnalyticsElement(child)
    if (match) return match
  }
  return null
}

describe("assistant page date serialization", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.getDashboardContext.mockResolvedValue({
      user: { id: "user-a" },
      isDemo: false,
    })
    mocks.listConversationsForUser.mockResolvedValue([
      {
        id: "conversation-a",
        title: "UTC conversation",
        createdAt: new Date("2026-07-14T23:30:00+03:00"),
        updatedAt: new Date("2026-07-15T02:15:00+03:00"),
      },
    ])
  })

  it("passes deterministic UTC timestamps to AIAnalytics", async () => {
    const page = await AssistantPage({ searchParams: Promise.resolve({}) })
    const analytics = findAnalyticsElement(page)
    expect(analytics).not.toBeNull()

    const props = analytics?.props as {
      conversations: Array<{ createdAt: string; updatedAt: string }>
    }
    expect(props.conversations).toEqual([
      expect.objectContaining({
        createdAt: "2026-07-14T20:30:00.000Z",
        updatedAt: "2026-07-14T23:15:00.000Z",
      }),
    ])
  })
})
