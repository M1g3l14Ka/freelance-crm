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
    <Card>
      <CardHeader>
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <CardTitle>
            Income Comparison
          </CardTitle>
          <div className="app-segment">
            <Button
              size="sm"
              onClick={() => setCompareType("month")}
              variant={compareType === "month" ? "default" : "ghost"}
              className={
                compareType === "month"
                  ? "bg-accent text-accent-foreground hover:bg-accent-hover"
                  : ""
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
                  ? "bg-accent text-accent-foreground hover:bg-accent-hover"
                  : ""
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
              <div className="text-sm text-text-secondary">
                Change:{" "}
                <span
                  className={`font-bold ${
                    percentageChange >= 0
                      ? "text-success"
                      : "text-destructive"
                  }`}
                >
                  {percentageChange >= 0 ? "+" : ""}
                  {percentageChange.toFixed(1)}%
                </span>
              </div>
              {percentageChange >= 0 ? (
                <span className="text-success text-lg">📈</span>
              ) : (
                <span className="text-destructive text-lg">📉</span>
              )}
            </div>
            <div className="h-80 min-w-0 sm:h-96">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={comparisonData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#2a2a30" fill="none" />
                  <XAxis dataKey="name" stroke="#7c7c86" tick={{ fill: '#a1a1aa', fontSize: 12 }} />
                  <YAxis 
                    stroke="#7c7c86"
                    tick={{ fill: '#a1a1aa', fontSize: 12 }}
                    tickFormatter={(value) => `${(value / 1000000).toFixed(1)}M ${CURRENCY_SYMBOLS[primaryCurrency]}`}
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
                      color: "#b4b4bd",
                      paddingTop: "10px"
                    }}
                  />
                  <Bar 
                    dataKey="income" 
                    name={`Income (${CURRENCY_SYMBOLS[primaryCurrency]})`} 
                    radius={[8, 8, 0, 0]}
                    fill="#f59e0b"
                    maxBarSize={72}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </>
        ) : (
          <div className="flex h-80 flex-col items-center justify-center text-text-muted sm:h-96">
            <TrendingUp className="w-12 h-12 mb-4 opacity-20" />
            <div className="text-center">
              <div className="font-bold mb-2">Not enough data</div>
              <div className="text-sm text-text-muted">
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
