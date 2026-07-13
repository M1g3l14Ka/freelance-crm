import type { Metadata } from "next"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { ResetPasswordForm } from "./ResetPasswordForm"

export const metadata: Metadata = {
  title: "Reset password | MKFox CRM",
  robots: { index: false, follow: false },
}

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string | string[] }>
}) {
  const tokenValue = (await searchParams).token
  const token = typeof tokenValue === "string" ? tokenValue : null

  return (
    <div className="flex min-h-screen items-center justify-center bg-page p-4 sm:p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-xl font-semibold tracking-tight text-text-primary">
            Choose a new password
          </CardTitle>
        </CardHeader>
        <CardContent>
          {token ? (
            <ResetPasswordForm token={token} />
          ) : (
            <div className="space-y-4 text-center">
              <p className="text-sm leading-6 text-destructive" role="alert">
                This password reset link is invalid or has expired.
              </p>
              <Link
                href="/forgot-password"
                className="font-medium text-accent hover:text-warning hover:underline"
              >
                Request a new reset link
              </Link>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
