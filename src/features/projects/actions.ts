'use server'

import { prisma } from "@/lib/prisma"
import { revalidatePath } from "next/cache"
import { requireWritableUser } from "@/lib/auth-guard"
import { actionFailure } from "@/lib/action-error"

export async function createProject(formData: FormData) {
  const user = await requireWritableUser()

  const title = formData.get('title') as string
  const grossIncome = parseFloat(formData.get('grossIncome') as string)
  const taxRate = parseFloat(formData.get('taxRate') as string) || 6.0
  const currency = formData.get('currency') as string || "RUB"

  if (!title || !grossIncome) {
    return
  }

  const netIncome = grossIncome - (grossIncome * taxRate / 100)

  try {
    await prisma.project.create({
      data: {
        title,
        grossIncome,
        taxRate,
        netIncome,
        currency,
        status: "ACTIVE",
        userId: user.id
      }
    })

    revalidatePath("/dashboard", "layout")
    return { success: true }
  } catch (err) {
    return actionFailure("Create project", err)
  }
}

export async function deleteProject(id: string) {
  const user = await requireWritableUser()

  try {
    await prisma.project.delete({
      where: { id, userId: user.id },
    })
    revalidatePath("/dashboard", "layout")
    return { success: true }
  } catch (err) {
    return actionFailure("Delete project", err)
  }
}

export async function updateProjectStatus(id: string, status: string) {
  const user = await requireWritableUser()

  try {
    await prisma.project.update({
      where: { id, userId: user.id },
      data: { status },
    })
    revalidatePath("/dashboard", "layout")
    return { success: true }
  } catch (err) {
    return actionFailure("Update project status", err)
  }
}
