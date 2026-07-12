"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { Button } from "@/shared/ui/button"
import { Input } from "@/shared/ui/input"
import { Label } from "@/shared/ui/label"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog"
import { BudgetLimit, Expense } from "@prisma/client"
import { createBudgetLimit, deleteBudgetLimit, addExpense, deleteExpense, getExpensesForPeriod } from "@/features/budget/actions"
import { Plus, Trash2, TrendingUp, CreditCard } from "lucide-react"
import { AnimatedDiv } from "@/shared/ui/animated"

interface BudgetTrackerProps {
  budgetLimits: BudgetLimit[]
  readOnly?: boolean
}

export function BudgetTracker({ budgetLimits, readOnly = false }: BudgetTrackerProps) {
  const [open, setOpen] = useState(false)
  const [expenseOpen, setExpenseOpen] = useState(false)
  const [expenses, setExpenses] = useState<Expense[]>([])

  useEffect(() => {
    let ignore = false
    // Load expenses for current month
    const now = new Date()
    getExpensesForPeriod(now.getMonth() + 1, now.getFullYear()).then((result) => {
      if (!ignore) setExpenses(result)
    })

    return () => {
      ignore = true
    }
  }, [])

  const currentMonthLimit = budgetLimits.find(
    (b) =>
      b.period === "month" &&
      b.month === new Date().getMonth() + 1 &&
      b.year === new Date().getFullYear()
  )

  // Calculate real spent amount from expenses
  const spentThisMonth = expenses.reduce((sum, exp) => sum + exp.amount, 0)

  const handleAddExpense = async (formData: FormData) => {
    await addExpense(formData)
    setExpenseOpen(false)
    // Reload expenses
    const now = new Date()
    const updated = await getExpensesForPeriod(now.getMonth() + 1, now.getFullYear())
    setExpenses(updated)
  }

  const handleDeleteExpense = async (id: string) => {
    await deleteExpense(id)
    // Reload expenses
    const now = new Date()
    const updated = await getExpensesForPeriod(now.getMonth() + 1, now.getFullYear())
    setExpenses(updated)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center flex-wrap gap-2">
          <CardTitle>
            Budget Limits
          </CardTitle>
          <div className="flex gap-2">
            {!readOnly && currentMonthLimit && (
              <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
                <DialogTrigger asChild>
                  <Button variant="secondary">
                    <CreditCard size={16} className="mr-2" />
                    Expense
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader className="border-b border-border pb-4">
                    <DialogTitle>Add Expense</DialogTitle>
                  </DialogHeader>

                  <form action={handleAddExpense} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="title">
                        Description
                      </Label>
                      <Input
                        id="title"
                        name="title"
                        placeholder="Netflix, Rent, Food..."
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="amount">
                        Amount (₽)
                      </Label>
                      <Input
                        id="amount"
                        name="amount"
                        type="number"
                        placeholder="5000"
                        required
                        className="[&::-webkit-inner-spin-button]:appearance-none"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="date">
                        Date
                      </Label>
                      <Input
                        id="date"
                        name="date"
                        type="date"
                        defaultValue={new Date().toISOString().split('T')[0]}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category">
                        Category
                      </Label>
                      <select
                        id="category"
                        name="category"
                        className="app-select"
                      >
                        <option value="Food">Food</option>
                        <option value="Transport">Transport</option>
                        <option value="Entertainment">Entertainment</option>
                        <option value="Utilities">Utilities</option>
                        <option value="Shopping">Shopping</option>
                        <option value="Other">Other</option>
                      </select>
                    </div>

                    <Button
                      type="submit"
                      className="w-full"
                    >
                      Add Expense
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}

            {!readOnly && <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus size={16} className="mr-2" />
                  Limit
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader className="border-b border-border pb-4">
                  <DialogTitle>Set Limit</DialogTitle>
                </DialogHeader>

                <form
                  action={async (formData) => {
                    await createBudgetLimit(formData)
                    setOpen(false)
                  }}
                  className="space-y-4 pt-4"
                >
                  <div className="space-y-2">
                    <Label htmlFor="period">
                      Period
                    </Label>
                    <select
                      id="period"
                      name="period"
                      className="app-select"
                    >
                      <option value="month">Month</option>
                      <option value="year">Year</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="limitAmount">
                      Amount limit (₽)
                    </Label>
                    <Input
                      id="limitAmount"
                      name="limitAmount"
                      type="number"
                      placeholder="100000"
                      required
                      className="[&::-webkit-inner-spin-button]:appearance-none"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currency">
                      Currency
                    </Label>
                    <select
                      id="currency"
                      name="currency"
                      className="app-select"
                    >
                      <option value="RUB">₽ RUB</option>
                      <option value="USD">$ USD</option>
                      <option value="EUR">€ EUR</option>
                    </select>
                  </div>

                  <Button
                    type="submit"
                    className="w-full"
                  >
                    Save
                  </Button>
                </form>
              </DialogContent>
            </Dialog>}
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {currentMonthLimit ? (
          <AnimatedDiv>
            <div className="space-y-4">
              {/* Stats */}
              <div className="flex justify-between items-center">
                <div>
                  <div className="text-sm text-text-secondary">
                    Spent this month
                  </div>
                  <div className="text-2xl font-semibold tabular-nums text-text-primary">
                    {spentThisMonth.toLocaleString("ru-RU")}{" "}
                    {currentMonthLimit.currency}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-sm text-text-secondary">Limit</div>
                  <div className="text-2xl font-semibold tabular-nums text-text-primary">
                    {currentMonthLimit.limitAmount.toLocaleString("ru-RU")}{" "}
                    {currentMonthLimit.currency}
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="relative h-2 overflow-hidden rounded-full bg-muted">
                <div
                  className={`absolute top-0 left-0 h-full transition-[width] duration-300 ${
                    spentThisMonth / currentMonthLimit.limitAmount > 0.9
                      ? "bg-destructive"
                      : "bg-accent"
                  }`}
                  style={{
                    width: `${Math.min(
                      (spentThisMonth / currentMonthLimit.limitAmount) * 100,
                      100
                    )}%`,
                  }}
                />
              </div>

              {/* Remaining */}
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">
                  Remaining:{" "}
                  <span className="font-semibold text-text-primary">
                    {(
                      currentMonthLimit.limitAmount - spentThisMonth
                    ).toLocaleString("ru-RU")}{" "}
                    {currentMonthLimit.currency}
                  </span>
                </span>
                {!readOnly && (
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteBudgetLimit(currentMonthLimit.id)}
                  >
                    <Trash2 size={14} className="mr-1" />
                    Delete Limit
                  </Button>
                )}
              </div>

              {/* Expenses List */}
              {expenses.length > 0 && (
                <div className="mt-6 border-t border-border pt-6">
                  <h4 className="mb-3 text-sm font-semibold text-text-secondary">Expenses this month</h4>
                  <div className="space-y-2">
                    {expenses.map((expense) => (
                      <div
                        key={expense.id}
                        className="flex items-center justify-between rounded-lg border border-border bg-surface-elevated p-3"
                      >
                        <div className="flex items-center gap-3">
                          <CreditCard className="h-4 w-4 text-text-muted" />
                          <div>
                            <div className="font-medium text-text-primary">{expense.title}</div>
                            <div className="text-xs text-text-muted">
                              {expense.category} • {new Date(expense.date).toLocaleDateString("en-US", { month: 'short', day: 'numeric' })}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="font-semibold tabular-nums text-text-primary">
                            {expense.amount.toLocaleString("ru-RU")} {currentMonthLimit.currency}
                          </div>
                          {!readOnly && (
                            <Button
                              variant="destructive"
                              size="sm"
                              onClick={() => handleDeleteExpense(expense.id)}
                              className="h-8 w-8 p-0"
                            >
                              <Trash2 size={14} />
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </AnimatedDiv>
        ) : (
          <div className="py-10 text-center text-text-muted">
            <TrendingUp className="w-12 h-12 mx-auto mb-2 opacity-50" />
            <div>No limits set</div>
            <div className="text-sm">
              Set a spending limit for this month
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
