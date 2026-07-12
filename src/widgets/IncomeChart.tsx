"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { Button } from "@/shared/ui/button"
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  BarChart,
  Bar,
} from "recharts"
import { Project } from "@prisma/client"
import { CURRENCY_SYMBOLS, isCurrency, type Currency } from "@/lib/currency"

type Period = "day" | "week" | "month" | "year"
type IncomeType = "gross" | "net"

interface IncomeChartProps {
  projects: Project[]
}

export function IncomeChart({ projects }: IncomeChartProps) {
  const [period, setPeriod] = useState<Period>("month")
  const [incomeType, setIncomeType] = useState<IncomeType>("gross")
  const [chartType, setChartType] = useState<"line" | "bar">("bar")
  const [groupedData, setGroupedData] = useState<{ name: string; income: number }[]>([])
  const projectCurrency = projects[0]?.currency
  const primaryCurrency: Currency = projectCurrency && isCurrency(projectCurrency)
    ? projectCurrency
    : "RUB"

  useEffect(() => {
    let ignore = false

    async function loadData() {
      const data = await groupProjectsByPeriod(projects, period, incomeType, primaryCurrency)
      if (!ignore) setGroupedData(data)
    }

    loadData()

    return () => {
      ignore = true
    }
  }, [projects, period, incomeType, primaryCurrency])

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle>
            Income Chart
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            {/* Period */}
            <div className="app-segment">
              {(["day", "week", "month", "year"] as Period[]).map((p) => (
                <Button
                  key={p}
                  size="sm"
                  onClick={() => setPeriod(p)}
                  variant={period === p ? "default" : "ghost"}
                  className={
                    period === p
                      ? "bg-accent text-accent-foreground hover:bg-accent-hover"
                      : ""
                  }
                >
                  {p === "day" ? "Day" : p === "week" ? "Week" : p === "month" ? "Month" : "Year"}
                </Button>
              ))}
            </div>

            {/* Income type */}
            <div className="app-segment">
              {(["gross", "net"] as IncomeType[]).map((type) => (
                <Button
                  key={type}
                  size="sm"
                  onClick={() => setIncomeType(type)}
                  variant={incomeType === type ? "default" : "ghost"}
                  className={
                    incomeType === type
                      ? "bg-accent text-accent-foreground hover:bg-accent-hover"
                      : ""
                  }
                >
                  {type === "gross" ? "Gross" : "Net"}
                </Button>
              ))}
            </div>

            {/* Chart type */}
            <div className="app-segment">
              <Button
                size="sm"
                onClick={() => setChartType("bar")}
                variant={chartType === "bar" ? "default" : "ghost"}
                className={
                  chartType === "bar"
                    ? "bg-accent text-accent-foreground hover:bg-accent-hover"
                    : ""
                }
              >
                Bar
              </Button>
              <Button
                size="sm"
                onClick={() => setChartType("line")}
                variant={chartType === "line" ? "default" : "ghost"}
                className={
                  chartType === "line"
                    ? "bg-accent text-accent-foreground hover:bg-accent-hover"
                    : ""
                }
              >
                Line
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-80 min-w-0 sm:h-96">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "bar" ? (
              <BarChart data={groupedData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a30" fill="none" />
                <XAxis
                  dataKey="name"
                  stroke="#7c7c86"
                  tick={{ fill: '#a1a1aa', fontSize: 12 }}
                />
                <YAxis
                  stroke="#7c7c86"
                  tick={{ fill: '#a1a1aa', fontSize: 12 }}
                  tickFormatter={(value) => `${value.toLocaleString()} ${CURRENCY_SYMBOLS[primaryCurrency]}`}
                />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{
                    backgroundColor: "#18181c",
                    border: "1px solid #34343b",
                    borderRadius: "10px",
                    color: "#f4f4f5",
                  }}
                  labelStyle={{ color: "#fbbf24" }}
                  itemStyle={{ color: "#f59e0b" }}
                  formatter={(value) => {
                    if (typeof value === 'number') {
                      return [
                        `${value.toLocaleString("ru-RU")} ${CURRENCY_SYMBOLS[primaryCurrency]}`,
                        "Income"
                      ]
                    }
                    return [String(value), "Income"]
                  }}
                />
                <Legend 
                  wrapperStyle={{ color: "#b4b4bd", fontSize: "12px" }}
                />
                <Bar
                  dataKey="income"
                  name={`Income (${CURRENCY_SYMBOLS[primaryCurrency]})`}
                  fill="#f59e0b"
                  maxBarSize={72}
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            ) : (
              <LineChart data={groupedData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#2a2a30" fill="none" />
                <XAxis
                  dataKey="name"
                  stroke="#7c7c86"
                  tick={{ fill: '#a1a1aa', fontSize: 12 }}
                />
                <YAxis
                  stroke="#7c7c86"
                  tick={{ fill: '#a1a1aa', fontSize: 12 }}
                  tickFormatter={(value) => `${value.toLocaleString()} ${CURRENCY_SYMBOLS[primaryCurrency]}`}
                />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{
                    backgroundColor: "#18181c",
                    border: "1px solid #34343b",
                    borderRadius: "10px",
                    color: "#f4f4f5",
                  }}
                  labelStyle={{ color: "#fbbf24" }}
                  itemStyle={{ color: "#f59e0b" }}
                  formatter={(value) => {
                    if (typeof value === 'number') {
                      return [
                        `${value.toLocaleString("ru-RU")} ${CURRENCY_SYMBOLS[primaryCurrency]}`,
                        "Income"
                      ]
                    }
                    return [String(value), "Income"]
                  }}
                />
                <Legend 
                  wrapperStyle={{ color: "#b4b4bd", fontSize: "12px" }}
                />
                <Line
                  type="monotone"
                  dataKey="income"
                  name={`Income (${CURRENCY_SYMBOLS[primaryCurrency]})`}
                  stroke="#f59e0b"
                  strokeWidth={2}
                  dot={{ fill: "#f59e0b", strokeWidth: 2 }}
                />
              </LineChart>
            )}
          </ResponsiveContainer>
        </div>
      </CardContent>
    </Card>
  )
}

// Function to group projects by period with conversion
async function groupProjectsByPeriod(projects: Project[], period: Period, incomeType: IncomeType, targetCurrency: Currency) {
  const groups = new Map<string, number>()

  for (const project of projects) {
    const date = new Date(project.createdAt)
    let key = ""

    if (period === "day") {
      key = date.toLocaleDateString("ru-RU", { day: "numeric", month: "short", year: "numeric" })
    } else if (period === "week") {
      const weekNum = getWeekNumber(date)
      const year = date.getFullYear()
      key = `${year} Week ${weekNum}`
    } else if (period === "month") {
      key = date.toLocaleDateString("ru-RU", { month: "long", year: "numeric" })
    } else if (period === "year") {
      key = date.getFullYear().toString()
    }

    let income = incomeType === "gross" ? project.grossIncome : (project.netIncome || 0)

    // Convert to target currency if needed
    if (project.currency !== targetCurrency) {
      try {
        const response = await fetch(`/api/exchange-rate?from=${project.currency}&to=${targetCurrency}`)
        const data = await response.json()
        income = income * (data.rate || 1)
      } catch {
        // If error, keep as is
      }
    }

    groups.set(key, (groups.get(key) || 0) + income)
  }

  // Convert Map to array and sort
  return Array.from(groups.entries())
    .map(([name, income]) => ({ name, income }))
    .sort((a, b) => {
      const aDate = parsePeriodName(a.name, period)
      const bDate = parsePeriodName(b.name, period)
      return aDate.getTime() - bDate.getTime()
    })
}

function getWeekNumber(date: Date): number {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
  const dayNum = d.getUTCDay() || 7
  d.setUTCDate(d.getUTCDate() + 4 - dayNum)
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7)
}

function parsePeriodName(name: string, period: Period): Date {
  try {
    if (period === "year") {
      return new Date(parseInt(name), 0, 1)
    }
    if (period === "month") {
      const parts = name.split(" ")
      const month = parts[0]
      const year = parts[1]
      return new Date(Date.parse(`1 ${month} ${year}`))
    }
    if (period === "week") {
      const parts = name.split(" ")
      const year = parseInt(parts[0])
      const weekNum = parseInt(parts[2])
      const date = new Date(year, 0, 1 + (weekNum - 1) * 7)
      return date
    }
    // For days, parse as is
    return new Date(Date.parse(name))
  } catch {
    return new Date()
  }
}
