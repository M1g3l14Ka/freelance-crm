"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { Label } from "@/shared/ui/label"
import Link from "next/link"
import { signup } from "./actions"

export default function SignUpPage() {
  const router = useRouter()
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true)
    setError("")

    const formData = new FormData(e.currentTarget)
    const email = formData.get("email") as string
    const password = formData.get("password") as string
    const name = formData.get("name") as string

    try {
      const result = await signup({ email, password, name })

      if (result?.error) {
        setError(result.error)
      } else {
        router.push("/auth/signin")
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
            Sign Up for Freelance CRM
          </CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label className="text-transparent bg-clip-text bg-linear-60 from-yellow-500 to-orange-600" htmlFor="name">Name (optional)</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="John Doe"
                className="bg-zinc-900 border-zinc-800 text-white"
              />
            </div>
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
                minLength={8}
                maxLength={128}
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
              {loading ? "Signing up..." : "Sign Up"}
            </Button>
          </form>
          <p className="mt-4 text-center text-zinc-400 text-sm">
            Already have an account?{" "}
            <Link href="/auth/signin" className="text-orange-500 hover:underline">
              Sign In
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  )
}


