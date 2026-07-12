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
      <div><h1 className="app-page-title">Analytics</h1><p className="app-page-description">Detailed income, comparison, expense, and budget views.</p></div>
      <div className="grid min-w-0 gap-6 xl:grid-cols-2">
        <div className="min-w-0"><IncomeChart projects={projects} /></div>
        <div className="min-w-0"><ComparisonChart projects={projects} /></div>
      </div>
      <BudgetTracker budgetLimits={budgetLimits} readOnly={isDemo} />
    </>
  )
}
