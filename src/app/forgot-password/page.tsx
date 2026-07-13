import type { Metadata } from "next"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { ForgotPasswordForm } from "./ForgotPasswordForm"

export const metadata: Metadata = {
  title: "Forgot password | MKFox CRM",
  robots: { index: false, follow: false },
}

export default function ForgotPasswordPage() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-page p-4 sm:p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle className="text-center text-xl font-semibold tracking-tight text-text-primary">
            Reset your password
          </CardTitle>
          <p className="text-center text-sm leading-6 text-text-secondary">
            Enter your account email and we will send you a secure reset link.
          </p>
        </CardHeader>
        <CardContent>
          <ForgotPasswordForm />
        </CardContent>
      </Card>
    </div>
  )
}
