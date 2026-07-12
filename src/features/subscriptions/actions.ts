"use server"

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireWritableUser } from "@/lib/auth-guard"
import { actionFailure } from "@/lib/action-error"

export async function createSubscription(formData: FormData) {
  const user = await requireWritableUser()

  const title = formData.get("title") as string
  const amount = parseFloat(formData.get("amount") as string)
  const intervalDays = parseInt(formData.get("intervalDays") as string)
  const nextPaymentDate = new Date(formData.get("nextPaymentDate") as string)
  const currency = formData.get("currency") as string || "RUB"

  if (!title || !amount || !intervalDays || !nextPaymentDate) {
    return
  }

  try {
    await prisma.subscription.create({
      data: {
        title,
        amount,
        intervalDays,
        nextPaymentDate,
        currency,
        userId: user.id,
      },
    })

    revalidatePath("/")
    return { success: true }
  } catch (err) {
    return actionFailure("Create subscription", err)
  }
}

export async function deleteSubscription(id: string) {
  const user = await requireWritableUser()

  try {
    await prisma.subscription.delete({
      where: { id, userId: user.id },
    })
    revalidatePath("/")
    return { success: true }
  } catch (err) {
    return actionFailure("Delete subscription", err)
  }
}

export async function updateSubscriptionDates() {
  const user = await requireWritableUser()

  try {
    const subscriptions = await prisma.subscription.findMany({
      where: { userId: user.id },
    })

    const today = new Date()

    for (const sub of subscriptions) {
    const nextDate = new Date(sub.nextPaymentDate)

    // If payment date has passed or is today
    if (nextDate <= today) {
      // Shift date to next interval
      const newDate = new Date(nextDate)
      newDate.setDate(newDate.getDate() + sub.intervalDays)

      // Logic for shifting months with different number of days
      if (sub.intervalDays === 30) {
        const currentMonthDays = new Date(
          newDate.getFullYear(),
          newDate.getMonth() + 1,
          0
        ).getDate()

        if (currentMonthDays < 30) {
          // If month has fewer days (28), shift to last day of month
          newDate.setDate(currentMonthDays)
        }
      }

        await prisma.subscription.update({
          where: { id: sub.id, userId: user.id },
          data: { nextPaymentDate: newDate },
        })
      }
    }

    revalidatePath("/")
    return { success: true }
  } catch (err) {
    return actionFailure("Update subscription dates", err)
  }
}
