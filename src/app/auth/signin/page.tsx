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
        router.push("/")
        router.refresh()
      }
    } catch {
      setError("Something went wrong")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#050505] p-4">
      <Card className="w-full max-w-md bg-[#0a0a0a] border-zinc-800">
        <CardHeader>
          <CardTitle className="text-2xl font-bold text-center text-transparent bg-clip-text bg-linear-60 from-yellow-500 to-orange-600">
            Sign In to Freelance CRM
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-transparent bg-clip-text bg-linear-60 from-yellow-500 to-orange-600" htmlFor="Email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="you@example.com"
                required
                className="bg-zinc-900 border-zinc-800 text-white"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-transparent bg-clip-text bg-linear-60 from-yellow-500 to-orange-600" htmlFor="password">Password</Label>
              <Input
                id="password"
                name="password"
                type="password"
                required
                className="bg-zinc-900 border-zinc-800 text-white"
              />
            </div>
            {error && (
              <p className="text-red-500 text-sm text-center">{error}</p>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="w-full text-lg text-black font-bold font-mono bg-linear-90 from-yellow-500 to-orange-600 hover:scale-95 cursor-pointer"
            >
              {loading ? "Signing in..." : "Sign In"}
            </Button>
          </form>
          <div className="my-4 flex items-center gap-3" aria-hidden="true">
            <div className="h-px flex-1 bg-zinc-800" />
            <span className="text-xs text-zinc-500">or</span>
            <div className="h-px flex-1 bg-zinc-800" />
          </div>
          <form action={demoAction}>
            <Button
              type="submit"
              variant="outline"
              disabled={demoPending}
              className="w-full border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800"
            >
              {demoPending ? "Opening demo..." : "View demo workspace"}
            </Button>
            {demoState.error && (
              <p className="mt-2 text-center text-sm text-red-500" role="alert">
                {demoState.error}
              </p>
            )}
          </form>
          <p className="mt-4 text-center text-zinc-400 text-sm">
            Don&apos;t have an account?{" "}
            <Link href="/auth/signup" className="text-orange-500 hover:underline">
              Sign Up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}


