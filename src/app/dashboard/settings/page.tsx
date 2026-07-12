import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { getDashboardContext } from "@/lib/dashboard"

export default async function SettingsPage() {
  const { user, isDemo } = await getDashboardContext()
  return (
    <>
      <div><h1 className="app-page-title">Settings</h1><p className="app-page-description">Account information and workspace status.</p></div>
      <Card className="max-w-2xl">
        <CardHeader><CardTitle>Account</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Name</div><div className="mt-1 text-text-primary">{user.name || "Not provided"}</div></div>
          <div><div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Email</div><div className="mt-1 text-text-primary">{user.email}</div></div>
          <div><div className="text-xs font-semibold uppercase tracking-wide text-text-muted">Workspace access</div><div className="mt-1 text-text-primary">{isDemo ? "Read-only demo" : "Standard account"}</div></div>
        </CardContent>
      </Card>
    </>
  )
}
