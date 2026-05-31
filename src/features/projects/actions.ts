'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { auth } from "@/lib/auth"

export async function createProject(formData: FormData) {
  const session = await auth()

  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  const title = formData.get('title') as string
  const grossIncome = parseFloat(formData.get('grossIncome') as string)
  const taxRate = parseFloat(formData.get('taxRate') as string) || 6.0
  const currency = formData.get('currency') as string || "RUB"

  if (!title || !grossIncome) {
    return
  }

  const netIncome = grossIncome - (grossIncome * taxRate / 100)

  await prisma.project.create({
    data: {
      title,
      grossIncome,
      taxRate,
      netIncome,
      currency,
      status: "ACTIVE",
      userId: session.user.id
    }
  })

  revalidatePath("/")
}

export async function deleteProject(id: string) {
  const session = await auth()

  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  try {
    await prisma.project.delete({
      where: { id, userId: session.user.id },
    })
    revalidatePath("/")
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}

export async function updateProjectStatus(id: string, status: string) {
  const session = await auth()

  if (!session?.user?.id) {
    throw new Error("Unauthorized")
  }

  try {
    await prisma.project.update({
      where: { id, userId: session.user.id },
      data: { status },
    })
    revalidatePath("/")
    return { success: true }
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : "Unknown error" }
  }
}
