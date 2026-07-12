import { beforeEach, describe, expect, it, vi } from "vitest"

const mocks = vi.hoisted(() => ({
  requireUser: vi.fn(),
  requireWritableUser: vi.fn(),
  revalidatePath: vi.fn(),
  projectCreate: vi.fn(),
  projectDelete: vi.fn(),
  projectUpdate: vi.fn(),
  subscriptionFindMany: vi.fn(),
  subscriptionCreate: vi.fn(),
  subscriptionUpdate: vi.fn(),
  budgetLimitFindFirst: vi.fn(),
  budgetLimitUpsert: vi.fn(),
  expenseCreate: vi.fn(),
}))

vi.mock("server-only", () => ({}))
vi.mock("@/lib/auth-guard", () => ({
  requireUser: mocks.requireUser,
  requireWritableUser: mocks.requireWritableUser,
}))
vi.mock("next/cache", () => ({ revalidatePath: mocks.revalidatePath }))
vi.mock("@/lib/prisma", () => ({
  prisma: {
    project: {
      create: mocks.projectCreate,
      delete: mocks.projectDelete,
      update: mocks.projectUpdate,
    },
    subscription: {
      create: mocks.subscriptionCreate,
      findMany: mocks.subscriptionFindMany,
      update: mocks.subscriptionUpdate,
    },
    budgetLimit: {
      findFirst: mocks.budgetLimitFindFirst,
      upsert: mocks.budgetLimitUpsert,
    },
    expense: {
      create: mocks.expenseCreate,
    },
  },
}))

import { createProject, deleteProject } from "@/features/projects/actions"
import { createSubscription, updateSubscriptionDates } from "@/features/subscriptions/actions"
import { addExpense, createBudgetLimit } from "@/features/budget/actions"

describe("server action authorization", () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.requireUser.mockResolvedValue({ id: "user-a", email: "a@example.com" })
    mocks.requireWritableUser.mockResolvedValue({ id: "user-a", email: "a@example.com" })
  })

  it("rejects an unauthenticated action before accessing Prisma", async () => {
    mocks.requireWritableUser.mockRejectedValue(new Error("Unauthorized"))

    await expect(createProject(new FormData())).rejects.toThrow("Unauthorized")
    expect(mocks.projectCreate).not.toHaveBeenCalled()
  })

  it("allows a normal user to create data owned by that user", async () => {
    mocks.projectCreate.mockResolvedValue({})
    const formData = new FormData()
    formData.set("title", "Owned project")
    formData.set("grossIncome", "1000")
    formData.set("taxRate", "6")
    formData.set("currency", "USD")

    await createProject(formData)

    expect(mocks.projectCreate).toHaveBeenCalledWith({
      data: expect.objectContaining({ userId: "user-a", title: "Owned project" }),
    })
  })

  it("rejects demo writes in every mutation category before Prisma", async () => {
    mocks.requireWritableUser.mockRejectedValue(new Error("Demo workspace is read-only"))

    await expect(createProject(new FormData())).rejects.toThrow("read-only")
    await expect(createSubscription(new FormData())).rejects.toThrow("read-only")
    await expect(createBudgetLimit(new FormData())).rejects.toThrow("read-only")
    await expect(addExpense(new FormData())).rejects.toThrow("read-only")

    expect(mocks.projectCreate).not.toHaveBeenCalled()
    expect(mocks.subscriptionCreate).not.toHaveBeenCalled()
    expect(mocks.budgetLimitUpsert).not.toHaveBeenCalled()
    expect(mocks.expenseCreate).not.toHaveBeenCalled()
  })

  it("includes the authenticated owner in a project mutation", async () => {
    mocks.projectDelete.mockRejectedValue(new Error("Record not found"))

    await expect(deleteProject("project-owned-by-user-b")).resolves.toEqual({
      success: false,
      error: "Unable to complete request",
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
