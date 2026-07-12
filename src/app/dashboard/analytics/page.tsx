import { prisma } from "@/lib/prisma"
import { getDashboardContext } from "@/lib/dashboard"
import { IncomeChart } from "@/widgets/IncomeChart"
import { ComparisonChart } from "@/widgets/ComparisonChart"
import { BudgetTracker } from "@/widgets/BudgetTracker"

export default async function AnalyticsPage() {
  const { user, isDemo } = await getDashboardContext()
  const [projects, budgetLimits] = await Promise.all([
    prisma.project.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    prisma.budgetLimit.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
  ])

  return (
    <>
      <div><h1 className="text-3xl font-bold">Analytics</h1><p className="mt-1 text-sm text-zinc-500">Detailed income, comparison, expense, and budget views.</p></div>
      <div className="grid gap-6 xl:grid-cols-2">
        <IncomeChart projects={projects} />
        <ComparisonChart projects={projects} />
      </div>
      <BudgetTracker budgetLimits={budgetLimits} readOnly={isDemo} />
    </>
  )
}
