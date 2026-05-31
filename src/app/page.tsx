import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card";
import { CreateProjectBtn } from "@/features/projects/CreateProjectButton";
import { prisma } from "@/lib/prisma";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table";
import { DeleteProjectButton } from "@/features/projects/DeleteProjectButton";
import { ProjectStatusToggle } from "@/features/projects/ProjectStatusToggle";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SignOutButton } from "@/features/auth/SignOutButton";
import { IncomeChart } from "@/widgets/IncomeChart";
import { ComparisonChart } from "@/widgets/ComparisonChart";
import { SubscriptionCalendar } from "@/widgets/SubscriptionCalendar";
import { BudgetTracker } from "@/widgets/BudgetTracker";
import { CreateSubscriptionBtn } from "@/features/subscriptions/CreateSubscriptionBtn";
import { AnimatedDiv, AnimatedHeader, AnimatedCard, AnimatedTableRow } from "@/shared/ui/animated";
import { CurrencySelector } from "@/features/currency/CurrencySelector";
import { convertProjectsToCurrency, CURRENCY_SYMBOLS, convertCurrency, type Currency } from "@/lib/currency";
import { AIAnalytics } from "@/widgets/AIAnalytics";

export const dynamic = "force-dynamic";

export default async function Dashboard({ searchParams }: { searchParams: Promise<{ currency?: string }> }) {
  const session = await auth();
  if (!session?.user?.id) redirect("/auth/signin");

  const { currency: selectedCurrency } = await searchParams;
  const baseCurrency = (selectedCurrency as Currency) || "RUB";

  const projects = await prisma.project.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: "desc" } });
  const subscriptions = await prisma.subscription.findMany({ where: { userId: session.user.id }, orderBy: { nextPaymentDate: "asc" } });
  const budgetLimits = await prisma.budgetLimit.findMany({ where: { userId: session.user.id }, orderBy: { createdAt: "desc" } });
  
  // Calculate statistics
  const activeProjects = projects.filter(p => p.status === "ACTIVE").length;
  const completedProjects = projects.filter(p => p.status === "COMPLETED").length;
  
  // Convert total amount to selected currency
  const totalEarned = await convertProjectsToCurrency(projects, baseCurrency);

  // Convert each project for the table
  const projectsWithConversion = await Promise.all(
    projects.map(async (project) => {
      const convertedAmount = baseCurrency !== project.currency
        ? await convertCurrency(project.netIncome || 0, project.currency as Currency, baseCurrency)
        : project.netIncome || 0;
      return { ...project, convertedAmount };
    })
  );

  return (
    <main className="p-8 max-w-6xl mx-auto space-y-8 text-white">
      <AnimatedHeader>
        <div className="flex justify-between items-center flex-wrap">
          <h1 className="text-4xl font-bold text-transparent bg-clip-text bg-linear-60 from-yellow-500 to-orange-600">Freelance CRM</h1>
          <div className="flex items-center gap-4">
            <CurrencySelector currentCurrency={baseCurrency} />
            <CreateSubscriptionBtn />
            <CreateProjectBtn />
            <span className="text-zinc-400 text-sm">{session.user.email}</span>
            <SignOutButton />
          </div>
        </div>
      </AnimatedHeader>

      <AnimatedDiv delay={0.1}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 bg-[#050505]">
          <AnimatedCard>
            <Card className="bg-[#050505] border-none">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-transparent bg-clip-text bg-linear-60 from-yellow-500 to-orange-600">Total Earned</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-transparent bg-clip-text bg-linear-60 from-yellow-500 to-orange-600">
                  {totalEarned.toLocaleString("ru-RU")} {CURRENCY_SYMBOLS[baseCurrency]}
                </div>
                {baseCurrency !== "RUB" && (
                  <div className="text-sm text-zinc-500 mt-1">
                    in {baseCurrency}
                  </div>
                )}
              </CardContent>
            </Card>
          </AnimatedCard>
          <AnimatedCard>
            <Card className="bg-[#050505] border-none">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-transparent bg-clip-text bg-linear-60 from-yellow-500 to-orange-600">Active Projects</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-transparent bg-clip-text bg-linear-60 from-yellow-500 to-orange-600">{activeProjects}</div>
              </CardContent>
            </Card>
          </AnimatedCard>
          <AnimatedCard>
            <Card className="bg-[#050505] border-none">
              <CardHeader>
                <CardTitle className="text-2xl font-bold text-transparent bg-clip-text bg-linear-60 from-yellow-500 to-orange-600">Completed Projects</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-4xl font-bold text-transparent bg-clip-text bg-linear-60 from-green-500 to-emerald-600">{completedProjects}</div>
              </CardContent>
            </Card>
          </AnimatedCard>
        </div>
      </AnimatedDiv>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <AnimatedDiv delay={0.2}>
          <IncomeChart projects={projects} />
        </AnimatedDiv>
        <AnimatedDiv delay={0.3}>
          <ComparisonChart projects={projects} />
        </AnimatedDiv>
      </div>

      <AnimatedDiv delay={0.6} className="mt-12">
        <h2 className="text-2xl font-bold mb-4 text-transparent bg-clip-text bg-linear-60 from-yellow-500 to-orange-600">Projects List</h2>
        <AnimatedDiv delay={0.7} className="border border-zinc-800 rounded-lg overflow-hidden bg-zinc-950">
          <Table>
            <TableHeader>
              <TableRow className="border-zinc-800 hover:bg-zinc-900">
                <TableHead className="text-zinc-400">Project Name</TableHead>
                <TableHead className="text-zinc-400">Status</TableHead>
                <TableHead className="text-zinc-400">Date Added</TableHead>
                <TableHead className="text-right text-zinc-400">Amount (after tax)</TableHead>
                <TableHead className="text-right text-zinc-400">In Currency</TableHead>
                <TableHead className="text-right text-zinc-400"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {projectsWithConversion.map((project, index) => (
                <AnimatedTableRow key={project.id} index={index}>
                  <TableCell className="font-medium">{project.title}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <span className={`px-2 py-1 text-xs font-bold rounded-full ${
                        project.status === "ACTIVE" 
                          ? "text-orange-500 bg-orange-950/30" 
                          : "text-green-500 bg-green-950/30"
                      }`}>
                        {project.status === "ACTIVE" ? "Active" : "Completed"}
                      </span>
                      <ProjectStatusToggle id={project.id} currentStatus={project.status} />
                    </div>
                  </TableCell>
                  <TableCell className="text-zinc-400">{new Date(project.createdAt).toLocaleDateString("ru-RU")}</TableCell>
                  <TableCell className="text-right font-bold text-orange-500">
                    {project.netIncome?.toLocaleString("ru-RU")} {CURRENCY_SYMBOLS[project.currency as Currency] || "₽"}
                    <div className="text-xs text-zinc-500 font-normal">
                      Tax {project.taxRate}% ({project.grossIncome.toLocaleString("ru-RU")} {CURRENCY_SYMBOLS[project.currency as Currency] || "₽"})
                    </div>
                  </TableCell>
                  <TableCell className="text-right text-zinc-400">
                    {baseCurrency !== project.currency && (
                      <span className="text-sm">
                        ≈ {project.convertedAmount?.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} {CURRENCY_SYMBOLS[baseCurrency]}
                      </span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DeleteProjectButton id={project.id} />
                  </TableCell>
                </AnimatedTableRow>
              ))}
              {projects.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-zinc-500 py-8 bg-[#050505]">
                    No projects yet. Add your first order!
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </AnimatedDiv>
      </AnimatedDiv>

      <AnimatedDiv delay={0.4}>
        <SubscriptionCalendar subscriptions={subscriptions} />
      </AnimatedDiv>

      <AnimatedDiv delay={0.5}>
        <BudgetTracker budgetLimits={budgetLimits} />
      </AnimatedDiv>

      <AIAnalytics />
    </main>
  );
}
