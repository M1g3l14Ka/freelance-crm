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
    <div className="min-h-screen bg-[#050505] text-white lg:grid lg:grid-cols-[240px_1fr]">
      <aside className="hidden border-r border-zinc-800 bg-zinc-950/80 p-5 lg:flex lg:flex-col">
        <div className="mb-8 text-xl font-bold text-transparent bg-clip-text bg-linear-60 from-yellow-500 to-orange-600">
          Freelance CRM
        </div>
        <DashboardNavigation />
        <div className="mt-auto flex items-center justify-between gap-3 border-t border-zinc-800 pt-4">
          <div className="min-w-0">
            <div className="truncate text-sm font-medium text-white">{user.name || "Account"}</div>
            <div className="truncate text-xs text-zinc-500">{user.email}</div>
          </div>
          <SignOutButton />
        </div>
      </aside>

      <div className="min-w-0">
        <header className="border-b border-zinc-800 bg-zinc-950/80 px-4 py-3 lg:hidden">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div>
              <div className="font-bold text-transparent bg-clip-text bg-linear-60 from-yellow-500 to-orange-600">Freelance CRM</div>
              <div className="max-w-64 truncate text-xs text-zinc-500">{user.email}</div>
            </div>
            <SignOutButton />
          </div>
          <div className="overflow-x-auto pb-1">
            <DashboardNavigation mobile />
          </div>
        </header>

        <main className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6 lg:p-8">
          {isDemo && (
            <div className="rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm text-orange-200" role="status">
              Demo workspace — sample data, read-only
            </div>
          )}
          {children}
        </main>
      </div>
    </div>
  )
}
