"use server"

import { prisma } from "@/lib/prisma"
import {
  hashPassword,
  isValidEmail,
  normalizeEmail,
  validatePassword,
} from "@/lib/credentials"

const SIGNUP_ERROR = "Unable to create account"

export async function signup({ email, password, name }: { email: string; password: string; name?: string }) {
  const normalizedEmail = normalizeEmail(email)
  const normalizedName = name?.trim() || undefined

  if (!isValidEmail(normalizedEmail)) {
    return { error: "Enter a valid email address" }
  }

  const passwordError = validatePassword(password)
  if (passwordError) return { error: passwordError }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingUser) return { error: SIGNUP_ERROR }

    const hashedPassword = await hashPassword(password)
    await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashedPassword,
        name: normalizedName,
      },
    })
    return { success: true }
  } catch (error) {
    console.error("Signup error:", error)
    return { error: SIGNUP_ERROR }
  }
}
