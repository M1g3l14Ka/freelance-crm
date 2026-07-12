"use client"

import { useActionState, useState } from "react"
import { signIn } from "next-auth/react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { Label } from "@/shared/ui/label"
import Link from "next/link"
import { signInToDemo } from "./actions"

export default function SignInPage() {
  const router = useRouter()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
  const [demoState, demoAction, demoPending] = useActionState(signInToDemo, {
    error: null,
  })

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string

    try {
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      })

      if (result?.error) {
        setError(result.error)
      } else {
        router.push("/dashboard")
        router.refresh()
      }
    } catch {
      setError("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-page p-4 sm:p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-xl font-semibold tracking-tight text-text-primary">
            Sign In to Freelance CRM
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form method="post" onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="you@example.com"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
              />
            </div>
            {error && (
              <p className="text-center text-sm text-destructive" role="alert">{error}</p>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="w-full"
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          <div className="my-4 flex items-center gap-3" aria-hidden="true">
            <div className="h-px flex-1 bg-border" />
            <span className="text-xs text-text-muted">or</span>
            <div className="h-px flex-1 bg-border" />
          </div>
          <form action={demoAction}>
            <Button
              type="submit"
              variant="outline"
              disabled={demoPending}
              className="w-full"
            >
              {demoPending ? "Opening demo..." : "View demo workspace"}
            </Button>
            {demoState.error && (
              <p className="mt-2 text-center text-sm text-destructive" role="alert">
                {demoState.error}
              </p>
            )}
          </form>
          <p className="mt-4 text-center text-sm text-text-secondary">
            Don&apos;t have an account?{" "}
            <Link href="/auth/signup" className="font-medium text-accent hover:text-warning hover:underline">
              Sign Up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}


