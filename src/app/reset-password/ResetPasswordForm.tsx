"use client"

import { useActionState } from "react"
import Link from "next/link"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { Label } from "@/shared/ui/label"
import { submitPasswordReset } from "./actions"
import type { ResetPasswordState } from "./state"

const initialState: ResetPasswordState = { success: false, message: null }

export function ResetPasswordForm({ token }: { token: string }) {
  const [state, action, pending] = useActionState(submitPasswordReset, initialState)

  if (state.success) {
    return (
      <div className="space-y-4 text-center">
        <p className="text-sm leading-6 text-text-secondary" role="status">
          {state.message}
        </p>
        <Button asChild className="w-full">
          <Link href="/auth/signin">Sign in</Link>
        </Button>
      </div>
    )
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="token" value={token} />
      <div className="space-y-2">
        <Label htmlFor="password">New password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={128}
          required
          disabled={pending}
          aria-describedby="password-requirements"
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="passwordConfirmation">Confirm new password</Label>
        <Input
          id="passwordConfirmation"
          name="passwordConfirmation"
          type="password"
          autoComplete="new-password"
          minLength={8}
          maxLength={128}
          required
          disabled={pending}
        />
      </div>
      <p id="password-requirements" className="text-xs leading-5 text-text-muted">
        Use 8–128 characters with at least one letter and one number.
      </p>
      {state.message && (
        <p className="text-center text-sm text-destructive" role="alert">
          {state.message}
        </p>
      )}
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Updating..." : "Update password"}
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
