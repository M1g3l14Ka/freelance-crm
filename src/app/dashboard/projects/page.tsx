import { CreateProjectBtn } from "@/features/projects/CreateProjectButton"
import { DeleteProjectButton } from "@/features/projects/DeleteProjectButton"
import { ProjectStatusToggle } from "@/features/projects/ProjectStatusToggle"
import { CurrencySelector } from "@/features/currency/CurrencySelector"
import { AnimatedTableRow } from "@/shared/ui/animated"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/shared/ui/table"
import { prisma } from "@/lib/prisma"
import { getDashboardContext } from "@/lib/dashboard"
import { convertCurrency, CURRENCY_SYMBOLS, isCurrency, type Currency } from "@/lib/currency"

export default async function ProjectsPage({ searchParams }: { searchParams: Promise<{ currency?: string }> }) {
  const { user, isDemo } = await getDashboardContext()
  const selectedCurrency = (await searchParams).currency
  const baseCurrency: Currency = selectedCurrency && isCurrency(selectedCurrency) ? selectedCurrency : "RUB"
  const projects = await prisma.project.findMany({ where: { userId: user.id }, orderBy: { createdAt: "desc" } })
  const projectsWithConversion = await Promise.all(projects.map(async (project) => ({
    ...project,
    convertedAmount: baseCurrency !== project.currency && isCurrency(project.currency)
      ? await convertCurrency(project.netIncome || 0, project.currency, baseCurrency)
      : project.netIncome || 0,
  })))

  return (
    <>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="app-page-title">Projects</h1>
          <p className="app-page-description">Create projects, track status, and review after-tax income.</p>
        </div>
        <div className="flex items-center gap-2">
          <CurrencySelector currentCurrency={baseCurrency} />
          {!isDemo && <CreateProjectBtn />}
        </div>
      </div>

      <div className="app-surface overflow-hidden">
        <Table className="min-w-[920px]">
          <TableHeader>
            <TableRow className="bg-surface-elevated/50 hover:bg-surface-elevated/50">
              <TableHead>Project name</TableHead><TableHead>Status</TableHead><TableHead>Date added</TableHead>
              <TableHead className="text-right">Amount after tax</TableHead><TableHead className="text-right">Converted</TableHead><TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {projectsWithConversion.map((project, index) => (
              <AnimatedTableRow key={project.id} index={index}>
                <TableCell className="font-medium text-text-primary">{project.title}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full border px-2.5 py-1 text-xs font-medium ${project.status === "ACTIVE" ? "border-warning/20 bg-warning/10 text-warning" : "border-success/20 bg-success/10 text-success"}`}>
                      {project.status === "ACTIVE" ? "Active" : "Completed"}
                    </span>
                    {!isDemo && <ProjectStatusToggle id={project.id} currentStatus={project.status} />}
                  </div>
                </TableCell>
                <TableCell className="text-text-secondary">{new Date(project.createdAt).toLocaleDateString("ru-RU")}</TableCell>
                <TableCell className="text-right font-semibold tabular-nums text-text-primary">
                  {project.netIncome?.toLocaleString("ru-RU")} {isCurrency(project.currency) ? CURRENCY_SYMBOLS[project.currency] : project.currency}
                  <div className="mt-1 text-xs font-normal text-text-muted">
                    Tax {project.taxRate}% ({project.grossIncome.toLocaleString("ru-RU")} {isCurrency(project.currency) ? CURRENCY_SYMBOLS[project.currency] : project.currency})
                  </div>
                </TableCell>
                <TableCell className="text-right tabular-nums text-text-secondary">
                  {baseCurrency !== project.currency && <>≈ {project.convertedAmount.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} {CURRENCY_SYMBOLS[baseCurrency]}</>}
                </TableCell>
                <TableCell>{!isDemo && <DeleteProjectButton id={project.id} />}</TableCell>
              </AnimatedTableRow>
            ))}
            {projects.length === 0 && <TableRow><TableCell colSpan={6} className="py-12 text-center text-text-muted">No projects yet.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
