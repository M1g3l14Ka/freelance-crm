"use server"

import { prisma } from "@/lib/prisma"
import bcrypt from "bcryptjs"

export async function signup({ email, password, name }: { email: string; password: string; name?: string }) {
  try {
    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) { return { error: "User with this email already exists" }; }
    const hashedPassword = await bcrypt.hash(password, 10);
    await prisma.user.create({ data: { email, password: hashedPassword, name } });
    return { success: true };
  } catch (error) {
    console.error("Signup error:", error);
    return { error: error instanceof Error ? error.message : "Something went wrong" };
  }
}
