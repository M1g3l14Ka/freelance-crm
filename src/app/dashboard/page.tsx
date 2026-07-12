import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { AnimatedCard, AnimatedDiv } from "@/shared/ui/animated"
import { CurrencySelector } from "@/features/currency/CurrencySelector"
import { CreateSubscriptionBtn } from "@/features/subscriptions/CreateSubscriptionBtn"
import { SubscriptionCalendar } from "@/widgets/SubscriptionCalendar"
import { IncomeChart } from "@/widgets/IncomeChart"
import { prisma } from "@/lib/prisma"
import { getDashboardContext } from "@/lib/dashboard"
import { CURRENCY_SYMBOLS, convertProjectsToCurrency, isCurrency, type Currency } from "@/lib/currency"

export default async function OverviewPage({ searchParams }: { searchParams: Promise<{ currency?: string }> }) {
  const { user, isDemo } = await getDashboardContext()
  const selectedCurrency = (await searchParams).currency
  const baseCurrency: Currency = selectedCurrency && isCurrency(selectedCurrency) ? selectedCurrency : "RUB"
  const [projects, subscriptions, budgetLimits, expenses] = await Promise.all([
    prisma.project.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    prisma.subscription.findMany({ where: { userId: user.id }, orderBy: { nextPaymentDate: "asc" } }),
    prisma.budgetLimit.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } }),
    prisma.expense.findMany({ where: { userId: user.id }, orderBy: { date: "desc" } }),
  ])
  const totalEarned = await convertProjectsToCurrency(projects, baseCurrency)
  const activeProjects = projects.filter((project) => project.status === "ACTIVE").length
  const now = new Date()
  const currentLimit = budgetLimits.find((limit) => limit.period === "month" && limit.month === now.getMonth() + 1 && limit.year === now.getFullYear())
  const spent = expenses.filter((expense) => {
    const date = new Date(expense.date)
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()
  }).reduce((sum, expense) => sum + expense.amount, 0)

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="app-page-title">Overview</h1>
          <p className="app-page-description">Your financial workspace at a glance.</p>
        </div>
        <div className="flex items-center gap-2">
          <CurrencySelector currentCurrency={baseCurrency} />
          {!isDemo && <CreateSubscriptionBtn />}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        {[
          ["Total earned", `${totalEarned.toLocaleString("ru-RU")} ${CURRENCY_SYMBOLS[baseCurrency]}`],
          ["Active projects", activeProjects.toString()],
          ["Monthly budget", currentLimit ? `${spent.toLocaleString("ru-RU")} / ${currentLimit.limitAmount.toLocaleString("ru-RU")} ${currentLimit.currency}` : "Not set"],
        ].map(([label, value]) => (
          <AnimatedCard key={label}>
            <Card className="h-full">
              <CardHeader><CardTitle className="text-xs font-semibold uppercase tracking-wide text-text-muted">{label}</CardTitle></CardHeader>
              <CardContent className="text-2xl font-semibold tracking-tight text-text-primary">{value}</CardContent>
            </Card>
          </AnimatedCard>
        ))}
      </div>

      <AnimatedDiv>
        <IncomeChart projects={projects} />
      </AnimatedDiv>

      <SubscriptionCalendar subscriptions={subscriptions} readOnly={isDemo} />
    </>
  )
}
