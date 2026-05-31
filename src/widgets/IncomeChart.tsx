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
import { CURRENCY_SYMBOLS, type Currency } from "@/lib/currency"

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
  const [primaryCurrency, setPrimaryCurrency] = useState<Currency>("RUB")

  // Determine primary currency
  useEffect(() => {
    const currencies = [...new Set(projects.map(p => p.currency))]
    setPrimaryCurrency((currencies[0] as Currency) || "RUB")
  }, [projects])

  // Group data by period with conversion
  useEffect(() => {
    const loadData = async () => {
      const data = await groupProjectsByPeriod(projects, period, incomeType, primaryCurrency)
      setGroupedData(data)
    }
    loadData()
  }, [projects, period, incomeType, primaryCurrency])

  return (
    <Card className="bg-[#050505] border-zinc-800">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="text-2xl font-bold text-transparent bg-clip-text bg-linear-60 from-yellow-500 to-orange-600">
            Income Chart
          </CardTitle>
          <div className="flex flex-wrap gap-2">
            {/* Period */}
            <div className="flex gap-1 bg-zinc-900 rounded-lg p-1">
              {(["day", "week", "month", "year"] as Period[]).map((p) => (
                <Button
                  key={p}
                  size="sm"
                  onClick={() => setPeriod(p)}
                  variant={period === p ? "default" : "ghost"}
                  className={
                    period === p
                      ? "bg-orange-500 hover:bg-orange-600 text-black font-bold"
                      : "text-zinc-400 hover:text-white"
                  }
                >
                  {p === "day" ? "Day" : p === "week" ? "Week" : p === "month" ? "Month" : "Year"}
                </Button>
              ))}
            </div>

            {/* Income type */}
            <div className="flex gap-1 bg-zinc-900 rounded-lg p-1">
              {(["gross", "net"] as IncomeType[]).map((type) => (
                <Button
                  key={type}
                  size="sm"
                  onClick={() => setIncomeType(type)}
                  variant={incomeType === type ? "default" : "ghost"}
                  className={
                    incomeType === type
                      ? "bg-orange-500 hover:bg-orange-600 text-black font-bold"
                      : "text-zinc-400 hover:text-white"
                  }
                >
                  {type === "gross" ? "Gross" : "Net"}
                </Button>
              ))}
            </div>

            {/* Chart type */}
            <div className="flex gap-1 bg-zinc-900 rounded-lg p-1">
              <Button
                size="sm"
                onClick={() => setChartType("bar")}
                variant={chartType === "bar" ? "default" : "ghost"}
                className={
                  chartType === "bar"
                    ? "bg-orange-500 hover:bg-orange-600 text-black font-bold"
                    : "text-zinc-400 hover:text-white"
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
                    ? "bg-orange-500 hover:bg-orange-600 text-black font-bold"
                    : "text-zinc-400 hover:text-white"
                }
              >
                Line
              </Button>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="h-100">
          <ResponsiveContainer width="100%" height="100%">
            {chartType === "bar" ? (
              <BarChart data={groupedData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" fill="none" />
                <XAxis
                  dataKey="name"
                  stroke="#666"
                  tick={{ fill: '#666' }}
                />
                <YAxis
                  stroke="#666"
                  tick={{ fill: '#666' }}
                  tickFormatter={(value) => `${value.toLocaleString()} ${CURRENCY_SYMBOLS[primaryCurrency]}`}
                />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{
                    backgroundColor: "#050505",
                    border: "1px solid #333",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                  labelStyle={{ color: "#fbbf24" }}
                  itemStyle={{ color: "#f97316" }}
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
                  wrapperStyle={{ color: "#fff" }}
                />
                <Bar
                  dataKey="income"
                  name={`Income (${CURRENCY_SYMBOLS[primaryCurrency]})`}
                  fill="#f97316"
                  radius={[8, 8, 0, 0]}
                />
              </BarChart>
            ) : (
              <LineChart data={groupedData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#333" fill="none" />
                <XAxis
                  dataKey="name"
                  stroke="#666"
                  tick={{ fill: '#666' }}
                />
                <YAxis
                  stroke="#666"
                  tick={{ fill: '#666' }}
                  tickFormatter={(value) => `${value.toLocaleString()} ${CURRENCY_SYMBOLS[primaryCurrency]}`}
                />
                <Tooltip
                  cursor={{ fill: 'transparent' }}
                  contentStyle={{
                    backgroundColor: "#050505",
                    border: "1px solid #333",
                    borderRadius: "8px",
                    color: "#fff",
                  }}
                  labelStyle={{ color: "#fbbf24" }}
                  itemStyle={{ color: "#f97316" }}
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
                  wrapperStyle={{ color: "#fff" }}
                />
                <Line
                  type="monotone"
                  dataKey="income"
                  name={`Income (${CURRENCY_SYMBOLS[primaryCurrency]})`}
                  stroke="#f97316"
                  strokeWidth={2}
                  dot={{ fill: "#f97316", strokeWidth: 2 }}
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
