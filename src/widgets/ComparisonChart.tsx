"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { Button } from "@/shared/ui/button"
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"
import { Project } from "@prisma/client"
import { CURRENCY_SYMBOLS, isCurrency, type Currency } from "@/lib/currency"
import { TrendingUp } from "lucide-react"

interface ComparisonChartProps {
  projects: Project[]
}

export function ComparisonChart({ projects }: ComparisonChartProps) {
  const [compareType, setCompareType] = useState<"month" | "day">("month")
  const [comparisonData, setComparisonData] = useState<{ name: string; income: number }[]>([])
  const [percentageChange, setPercentageChange] = useState(0)
  const projectCurrency = projects[0]?.currency
  const primaryCurrency: Currency = projectCurrency && isCurrency(projectCurrency)
    ? projectCurrency
    : "RUB"

  // Load comparison data
  useEffect(() => {
    let ignore = false

    const loadData = async () => {
      const result = await calculateComparison(projects, compareType, primaryCurrency)
      if (!ignore) {
        setComparisonData(result.comparisonData)
        setPercentageChange(result.percentageChange)
      }
    }
    loadData()

    return () => {
      ignore = true
    }
  }, [projects, compareType, primaryCurrency])

  return (
    <Card className="bg-[#050505] border-zinc-800">
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle className="text-2xl font-bold text-transparent bg-clip-text bg-linear-60 from-yellow-500 to-orange-600">
            Income Comparison
          </CardTitle>
          <div className="flex gap-1 bg-zinc-900 rounded-lg p-1">
            <Button
              size="sm"
              onClick={() => setCompareType("month")}
              variant={compareType === "month" ? "default" : "ghost"}
              className={
                compareType === "month"
                  ? "bg-orange-500 hover:bg-orange-600 text-black font-bold"
                  : "text-zinc-400 hover:text-white"
              }
            >
              By Month
            </Button>
            <Button
              size="sm"
              onClick={() => setCompareType("day")}
              variant={compareType === "day" ? "default" : "ghost"}
              className={
                compareType === "day"
                  ? "bg-orange-500 hover:bg-orange-600 text-black font-bold"
                  : "text-zinc-400 hover:text-white"
              }
            >
              By Day
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {comparisonData.length > 1 ? (
          <>
            <div className="mb-4 flex items-center gap-4">
              <div className="text-sm text-zinc-400">
                Change:{" "}
                <span
                  className={`font-bold ${
                    percentageChange >= 0
                      ? "text-green-500"
                      : "text-red-500"
                  }`}
                >
                  {percentageChange >= 0 ? "+" : ""}
                  {percentageChange.toFixed(1)}%
                </span>
              </div>
              {percentageChange >= 0 ? (
                <span className="text-green-500 text-lg">📈</span>
              ) : (
                <span className="text-red-500 text-lg">📉</span>
              )}
            </div>
            <div className="h-75">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#333" fill="none" />
                  <XAxis dataKey="name" stroke="#666" tick={{ fill: '#666' }} />
                  <YAxis 
                    stroke="#666" 
                    tick={{ fill: '#666' }} 
                    tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M ${CURRENCY_SYMBOLS[primaryCurrency]}`}
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
                    formatter={(value) => {
                      const numValue = typeof value === 'number' ? value : 0;
                      return [
                        `${numValue.toLocaleString("ru-RU", { minimumFractionDigits: 0, maximumFractionDigits: 0 })} ${CURRENCY_SYMBOLS[primaryCurrency]}`,
                        "Income"
                      ]
                    }}
                  />
                  <Legend 
                    wrapperStyle={{ 
                      color: "#fff",
                      paddingTop: "10px"
                    }}
                  />
                  <Bar 
                    dataKey="income" 
                    name={`Income (${CURRENCY_SYMBOLS[primaryCurrency]})`} 
                    radius={[8, 8, 0, 0]}
                    fill="#f97316"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <div className="h-75 flex flex-col items-center justify-center text-zinc-500">
            <TrendingUp className="w-12 h-12 mb-4 opacity-20" />
            <div className="text-center">
              <div className="font-bold mb-2">Not enough data</div>
              <div className="text-sm text-zinc-600">
                {projects.length === 0 
                  ? "Add your first project to see comparison"
                  : "Projects need to be from different months to compare"}
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

async function calculateComparison(projects: Project[], type: "month" | "day", targetCurrency: Currency) {
  const groups = new Map<string, number>()

  for (const project of projects) {
    const date = new Date(project.createdAt)
    let key = ""

    if (type === "month") {
      key = date.toLocaleDateString("ru-RU", {
        month: "long",
        year: "numeric",
      })
    } else {
      key = date.toLocaleDateString("ru-RU", {
        day: "numeric",
        month: "short",
      })
    }

    let income = project.netIncome || 0

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

  const comparisonData = Array.from(groups.entries())
    .map(([name, income]) => ({ name, income }))
    .sort((a, b) => {
      const aDate = parsePeriodName(a.name, type)
      const bDate = parsePeriodName(b.name, type)
      return aDate.getTime() - bDate.getTime()
    })
    .slice(-6) // Last 6 periods

  // Calculate percentage change between last two periods
  let percentageChange = 0
  if (comparisonData.length >= 2) {
    const prev = comparisonData[comparisonData.length - 2].income
    const current = comparisonData[comparisonData.length - 1].income
    
    if (prev === 0 && current === 0) {
      percentageChange = 0  // No change
    } else if (prev === 0) {
      percentageChange = 100  // New income appeared
    } else if (current === 0) {
      percentageChange = -100  // Income disappeared
    } else {
      percentageChange = ((current - prev) / prev) * 100
    }
  }

  return { comparisonData, percentageChange }
}

function parsePeriodName(name: string, type: "month" | "day"): Date {
  try {
    if (type === "month") {
      const parts = name.split(" ")
      const month = parts[0]
      const year = parts[1]
      return new Date(Date.parse(`1 ${month} ${year}`))
    }
    return new Date(Date.parse(name))
  } catch {
    return new Date()
  }
}
