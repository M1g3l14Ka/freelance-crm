"use client"

import { useActionState } from "react"
import Link from "next/link"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { Label } from "@/shared/ui/label"
import { requestPasswordReset } from "./actions"
import type { ForgotPasswordState } from "./state"

const initialState: ForgotPasswordState = { submitted: false, message: null }

export function ForgotPasswordForm() {
  const [state, action, pending] = useActionState(
    requestPasswordReset,
    initialState
  )

  if (state.submitted) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm leading-6 text-text-secondary" role="status">
          {state.message}
        </p>
        <Button asChild className="w-full">
          <Link href="/auth/signin">Back to sign in</Link>
        </Button>
      </div>
    )
  }

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@example.com"
          required
          disabled={pending}
        />
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Sending..." : "Send reset link"}
      </Button>
      <p className="text-center text-sm text-text-secondary">
        <Link
          href="/auth/signin"
          className="font-medium text-accent hover:text-warning hover:underline"
        >
          Back to sign in
        </Link>
      </p>
    </form>
  )
}
