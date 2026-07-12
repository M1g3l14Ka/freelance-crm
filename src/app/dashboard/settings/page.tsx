import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { getDashboardContext } from "@/lib/dashboard"

export default async function SettingsPage() {
  const { user, isDemo } = await getDashboardContext()
  return (
    <>
      <div><h1 className="text-3xl font-bold">Settings</h1><p className="mt-1 text-sm text-zinc-500">Account information and workspace status.</p></div>
      <Card className="max-w-2xl border-zinc-800 bg-zinc-950">
        <CardHeader><CardTitle>Account</CardTitle></CardHeader>
        <CardContent className="space-y-4">
          <div><div className="text-xs uppercase tracking-wide text-zinc-500">Name</div><div className="mt-1 text-white">{user.name || "Not provided"}</div></div>
          <div><div className="text-xs uppercase tracking-wide text-zinc-500">Email</div><div className="mt-1 text-white">{user.email}</div></div>
          <div><div className="text-xs uppercase tracking-wide text-zinc-500">Workspace access</div><div className="mt-1 text-white">{isDemo ? "Read-only demo" : "Standard account"}</div></div>
        </CardContent>
      </Card>
    </>
  )
}
