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
          <h1 className="text-3xl font-bold">Projects</h1>
          <p className="mt-1 text-sm text-zinc-500">Create projects, track status, and review after-tax income.</p>
        </div>
        <div className="flex items-center gap-2">
          <CurrencySelector currentCurrency={baseCurrency} />
          {!isDemo && <CreateProjectBtn />}
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-zinc-800 bg-zinc-950">
        <Table>
          <TableHeader>
            <TableRow className="border-zinc-800 hover:bg-zinc-900">
              <TableHead>Project name</TableHead><TableHead>Status</TableHead><TableHead>Date added</TableHead>
              <TableHead className="text-right">Amount after tax</TableHead><TableHead className="text-right">Converted</TableHead><TableHead />
            </TableRow>
          </TableHeader>
          <TableBody>
            {projectsWithConversion.map((project, index) => (
              <AnimatedTableRow key={project.id} index={index}>
                <TableCell className="font-medium">{project.title}</TableCell>
                <TableCell>
                  <div className="flex items-center gap-2">
                    <span className={`rounded-full px-2 py-1 text-xs font-bold ${project.status === "ACTIVE" ? "bg-orange-950/30 text-orange-500" : "bg-green-950/30 text-green-500"}`}>
                      {project.status === "ACTIVE" ? "Active" : "Completed"}
                    </span>
                    {!isDemo && <ProjectStatusToggle id={project.id} currentStatus={project.status} />}
                  </div>
                </TableCell>
                <TableCell className="text-zinc-400">{new Date(project.createdAt).toLocaleDateString("ru-RU")}</TableCell>
                <TableCell className="text-right font-bold text-orange-500">
                  {project.netIncome?.toLocaleString("ru-RU")} {isCurrency(project.currency) ? CURRENCY_SYMBOLS[project.currency] : project.currency}
                  <div className="text-xs font-normal text-zinc-500">
                    Tax {project.taxRate}% ({project.grossIncome.toLocaleString("ru-RU")} {isCurrency(project.currency) ? CURRENCY_SYMBOLS[project.currency] : project.currency})
                  </div>
                </TableCell>
                <TableCell className="text-right text-zinc-400">
                  {baseCurrency !== project.currency && <>≈ {project.convertedAmount.toLocaleString("ru-RU", { maximumFractionDigits: 2 })} {CURRENCY_SYMBOLS[baseCurrency]}</>}
                </TableCell>
                <TableCell>{!isDemo && <DeleteProjectButton id={project.id} />}</TableCell>
              </AnimatedTableRow>
            ))}
            {projects.length === 0 && <TableRow><TableCell colSpan={6} className="py-8 text-center text-zinc-500">No projects yet.</TableCell></TableRow>}
          </TableBody>
        </Table>
      </div>
    </>
  )
}
