"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireUser } from "@/lib/auth-guard"
import type { BudgetLimitCreateInput, ExpenseCreateInput } from "@/types/budget"

export async function createBudgetLimit(formData: FormData) {
  const user = await requireUser()

  const period = formData.get("period") as string
  const limitAmount = parseFloat(formData.get("limitAmount") as string)
  const currency = formData.get("currency") as string || "RUB"

  const now = new Date()
  const month = period === "month" ? now.getMonth() + 1 : undefined
  const year = now.getFullYear()

  try {
    const data: BudgetLimitCreateInput = {
      userId: user.id,
      period,
      limitAmount,
      currency,
      year,
    }

    if (month) {
      data.month = month
    }

    await prisma.budgetLimit.upsert({
      where: {
        userId_period_month_year: {
          userId: user.id,
          period,
          month: month ?? 0,
          year,
        },
      },
      update: {
        limitAmount,
        currency,
      },
      create: data,
    })

    revalidatePath("/")
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}

export async function updateBudgetSpent(id: string, spentAmount: number) {
  const user = await requireUser()

  try {
    await prisma.budgetLimit.update({
      where: { id, userId: user.id },
      data: { spentAmount },
    })
    revalidatePath("/")
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}

export async function deleteBudgetLimit(id: string) {
  const user = await requireUser()

  try {
    await prisma.budgetLimit.delete({
      where: { id, userId: user.id },
    })
    revalidatePath("/")
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}

export async function addExpense(formData: FormData) {
  const user = await requireUser()

  const title = formData.get("title") as string
  const amount = parseFloat(formData.get("amount") as string)
  const date = new Date(formData.get("date") as string)
  const category = formData.get("category") as string || "Other"
  const budgetLimitId = formData.get("budgetLimitId")

  try {
    let ownedBudgetLimitId: string | undefined

    if (typeof budgetLimitId === "string" && budgetLimitId) {
      const budgetLimit = await prisma.budgetLimit.findFirst({
        where: { id: budgetLimitId, userId: user.id },
        select: { id: true },
      })

      if (!budgetLimit) {
        return { success: false, error: "Invalid budget limit" }
      }

      ownedBudgetLimitId = budgetLimit.id
    }

    const data: ExpenseCreateInput = {
      userId: user.id,
      title,
      amount,
      date,
      category,
      budgetLimitId: ownedBudgetLimitId,
    }

    await prisma.expense.create({ data })
    revalidatePath("/")
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}

export async function deleteExpense(id: string) {
  const user = await requireUser()

  try {
    await prisma.expense.delete({
      where: { id, userId: user.id },
    })
    revalidatePath("/")
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}

export async function getExpensesForPeriod(month: number, year: number) {
  const user = await requireUser()

  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0)

  const expenses = await prisma.expense.findMany({
    where: {
      userId: user.id,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { date: "desc" },
  })

  return expenses
}
