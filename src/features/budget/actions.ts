"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"
import type { BudgetLimitCreateInput, ExpenseCreateInput } from "@/types/budget"

export async function createBudgetLimit(formData: FormData) {
  const session = await auth()

  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  const period = formData.get("period") as string
  const limitAmount = parseFloat(formData.get("limitAmount") as string)
  const currency = formData.get("currency") as string || "RUB"

  const now = new Date()
  const month = period === "month" ? now.getMonth() + 1 : undefined
  const year = now.getFullYear()

  try {
    const data: BudgetLimitCreateInput = {
      userId: session.user.id,
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
          userId: session.user.id,
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
  const session = await auth()

  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  try {
    await prisma.budgetLimit.update({
      where: { id, userId: session.user.id },
      data: { spentAmount },
    })
    revalidatePath("/")
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}

export async function deleteBudgetLimit(id: string) {
  const session = await auth()

  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  try {
    await prisma.budgetLimit.delete({
      where: { id, userId: session.user.id },
    })
    revalidatePath("/")
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}

export async function addExpense(formData: FormData) {
  const session = await auth()

  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  const title = formData.get("title") as string
  const amount = parseFloat(formData.get("amount") as string)
  const date = new Date(formData.get("date") as string)
  const category = formData.get("category") as string || "Other"

  try {
    const data: ExpenseCreateInput = {
      userId: session.user.id,
      title,
      amount,
      date,
      category,
    }

    await prisma.expense.create({ data })
    revalidatePath("/")
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}

export async function deleteExpense(id: string) {
  const session = await auth()

  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  try {
    await prisma.expense.delete({
      where: { id, userId: session.user.id },
    })
    revalidatePath("/")
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}

export async function getExpensesForPeriod(month: number, year: number) {
  const session = await auth()

  if (!session?.user?.id) {
    return []
  }

  const startDate = new Date(year, month - 1, 1)
  const endDate = new Date(year, month, 0)

  const expenses = await prisma.expense.findMany({
    where: {
      userId: session.user.id,
      date: {
        gte: startDate,
        lte: endDate,
      },
    },
    orderBy: { date: "desc" },
  })

  return expenses
}
