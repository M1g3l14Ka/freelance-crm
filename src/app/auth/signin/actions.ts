"use server"

import { AuthError } from "next-auth"
import { signIn } from "@/lib/auth"
import { getDemoUserId } from "@/lib/demo"

export type DemoSignInState = { error: string | null }

export async function signInToDemo(
  previousState: DemoSignInState
): Promise<DemoSignInState> {
  void previousState
  if (!getDemoUserId()) {
    return { error: "Demo workspace is not configured" }
  }

  try {
    await signIn("demo", { redirectTo: "/dashboard" })
  } catch (error) {
    if (!(error instanceof AuthError)) throw error
    console.error("Demo sign-in failed:", error.type)
  }

  return { error: "Demo workspace is temporarily unavailable" }
}
