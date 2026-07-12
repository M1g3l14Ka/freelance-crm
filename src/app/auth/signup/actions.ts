"use server"

import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const SIGNUP_ERROR = "Unable to create account"

export async function signup({ email, password, name }: { email: string; password: string; name?: string }) {
  const normalizedEmail = email.trim().toLowerCase()
  const normalizedName = name?.trim() || undefined

  if (normalizedEmail.length > 254 || !EMAIL_PATTERN.test(normalizedEmail)) {
    return { error: "Enter a valid email address" }
  }

  if (
    password.length < 8 ||
    password.length > 128 ||
    !/[A-Za-z]/.test(password) ||
    !/\d/.test(password)
  ) {
    return { error: "Password must be 8-128 characters and include a letter and a number" }
  }

  try {
    const existingUser = await prisma.user.findUnique({
      where: { email: normalizedEmail },
    })

    if (existingUser) return { error: SIGNUP_ERROR }

    const hashedPassword = await bcrypt.hash(password, 10)
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
