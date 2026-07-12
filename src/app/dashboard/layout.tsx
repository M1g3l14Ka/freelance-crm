import type { ReactNode } from "react"
import { DashboardNavigation } from "@/features/dashboard/DashboardNavigation"
import { SignOutButton } from "@/features/auth/SignOutButton"
import { getDashboardContext } from "@/lib/dashboard"
import { redirect } from "next/navigation"
import { AuthenticationRequiredError } from "@/lib/auth-guard"

export const dynamic = "force-dynamic"

export default async function DashboardLayout({ children }: { children: ReactNode }) {
  let context
  try {
    context = await getDashboardContext()
  } catch (error) {
    if (error instanceof AuthenticationRequiredError) {
      redirect("/auth/signin")
    }
    throw error
  }
  const { user, isDemo } = context

  return (
    <div className="min-h-screen bg-page text-text-primary lg:grid lg:grid-cols-[248px_1fr]">
      <aside className="hidden border-r border-sidebar-border bg-sidebar p-5 lg:flex lg:flex-col">
        <div className="mb-8 px-2 text-lg font-semibold tracking-tight text-text-primary">
          Freelance CRM
        </div>
        <DashboardNavigation />
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-sidebar-border px-2 pt-4">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-text-primary">{user.name || "Account"}</div>
            <div className="truncate text-xs text-text-muted">{user.email}</div>
          </div>
          <SignOutButton />
        </div>
      </aside>

      <div className="min-w-0">
        <header className="border-b border-border bg-sidebar px-4 py-3 lg:hidden">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="font-semibold tracking-tight text-text-primary">Freelance CRM</div>
              <div className="max-w-64 truncate text-xs text-text-muted">{user.email}</div>
            </div>
            <SignOutButton />
          </div>
          <div className="overflow-x-auto pb-1">
            <DashboardNavigation mobile />
          </div>
        </header>

        <main className="mx-auto max-w-7xl space-y-7 p-4 sm:p-6 lg:p-8 xl:p-10">
          {isDemo && (
            <div className="rounded-xl border border-warning/25 bg-warning/8 px-4 py-3 text-sm text-warning" role="status">
              Demo workspace — sample data, read-only
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  )
}
