import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  revalidatePath: vi.fn(),
  projectCreate: vi.fn(),
  projectDelete: vi.fn(),
  projectUpdate: vi.fn(),
  subscriptionFindMany: vi.fn(),
  subscriptionUpdate: vi.fn(),
  budgetLimitFindFirst: vi.fn(),
  expenseCreate: vi.fn(),
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/auth-guard", () => ({ requireUser: mocks.requireUser }))
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: {
      create: mocks.projectCreate,
      delete: mocks.projectDelete,
      update: mocks.projectUpdate,
    },
    subscription: {
      findMany: mocks.subscriptionFindMany,
      update: mocks.subscriptionUpdate,
    },
    budgetLimit: {
      findFirst: mocks.budgetLimitFindFirst,
    },
    expense: {
      create: mocks.expenseCreate,
    },
  },
}))

import { createProject, deleteProject } from "@/features/projects/actions"
import { updateSubscriptionDates } from "@/features/subscriptions/actions"
import { addExpense } from "@/features/budget/actions"

describe("server action authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireUser.mockResolvedValue({ id: "user-a", email: "a@example.com" })
  })

  it("rejects an unauthenticated action before accessing Prisma", async () => {
    mocks.requireUser.mockRejectedValue(new Error("Unauthorized"))

    await expect(createProject(new FormData())).rejects.toThrow("Unauthorized")
    expect(mocks.projectCreate).not.toHaveBeenCalled()
  })

  it("includes the authenticated owner in a project mutation", async () => {
    mocks.projectDelete.mockRejectedValue(new Error("Record not found"))

    await expect(deleteProject("project-owned-by-user-b")).resolves.toEqual({
      success: false,
      error: "Record not found",
    })
    expect(mocks.projectDelete).toHaveBeenCalledWith({
      where: { id: "project-owned-by-user-b", userId: "user-a" },
    })
  })

  it("rechecks subscription ownership in the final update", async () => {
    mocks.subscriptionFindMany.mockResolvedValue([
      {
        id: "subscription-a",
        userId: "user-a",
        nextPaymentDate: new Date("2020-01-01T00:00:00.000Z"),
        intervalDays: 30,
      },
    ])
    mocks.subscriptionUpdate.mockResolvedValue({})

    await updateSubscriptionDates()

    expect(mocks.subscriptionFindMany).toHaveBeenCalledWith({
      where: { userId: "user-a" },
    })
    expect(mocks.subscriptionUpdate).toHaveBeenCalledWith({
      where: { id: "subscription-a", userId: "user-a" },
      data: { nextPaymentDate: expect.any(Date) },
    })
  })

  it("rejects an expense linked to another user's budget limit", async () => {
    mocks.budgetLimitFindFirst.mockResolvedValue(null)
    const formData = new FormData()
    formData.set("title", "Expense")
    formData.set("amount", "25")
    formData.set("date", "2026-07-11")
    formData.set("budgetLimitId", "budget-owned-by-user-b")

    await expect(addExpense(formData)).resolves.toEqual({
      success: false,
      error: "Invalid budget limit",
    })
    expect(mocks.budgetLimitFindFirst).toHaveBeenCalledWith({
      where: { id: "budget-owned-by-user-b", userId: "user-a" },
      select: { id: true },
    })
    expect(mocks.expenseCreate).not.toHaveBeenCalled()
  })
})
