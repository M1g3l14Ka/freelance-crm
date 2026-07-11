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
}

export function BudgetTracker({ budgetLimits }: BudgetTrackerProps) {
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
    <Card className="bg-[#050505] border-zinc-800">
      <CardHeader>
        <div className="flex justify-between items-center flex-wrap gap-2">
          <CardTitle className="text-2xl font-bold text-transparent bg-clip-text bg-linear-60 from-yellow-500 to-orange-600">
            Budget Limits
          </CardTitle>
          <div className="flex gap-2">
            {currentMonthLimit && (
              <Dialog open={expenseOpen} onOpenChange={setExpenseOpen}>
                <DialogTrigger asChild>
                  <Button className="text-sm text-black font-bold font-mono bg-linear-90 from-green-500 to-emerald-600">
                    <CreditCard size={16} className="mr-2" />
                    Expense
                  </Button>
                </DialogTrigger>
                <DialogContent className="font-mono font-bold text-white bg-[#050505] border">
                  <DialogHeader className="border-b p-2 flex justify-center items-center">
                    <DialogTitle>Add Expense</DialogTitle>
                  </DialogHeader>

                  <form action={handleAddExpense} className="space-y-4 pt-4">
                    <div className="space-y-2">
                      <Label htmlFor="title" className="text-zinc-300">
                        Description
                      </Label>
                      <Input
                        id="title"
                        name="title"
                        placeholder="Netflix, Rent, Food..."
                        required
                        className="bg-zinc-900 border-zinc-800 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="amount" className="text-zinc-300">
                        Amount (₽)
                      </Label>
                      <Input
                        id="amount"
                        name="amount"
                        type="number"
                        placeholder="5000"
                        required
                        className="[&::-webkit-inner-spin-button]:appearance-none bg-zinc-900 border-zinc-800 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="date" className="text-zinc-300">
                        Date
                      </Label>
                      <Input
                        id="date"
                        name="date"
                        type="date"
                        defaultValue={new Date().toISOString().split('T')[0]}
                        required
                        className="bg-zinc-900 border-zinc-800 text-white"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="category" className="text-zinc-300">
                        Category
                      </Label>
                      <select
                        id="category"
                        name="category"
                        className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-white"
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
                      className="w-full text-lg text-black font-bold font-mono bg-linear-90 from-green-500 to-emerald-600 hover:scale-95 cursor-pointer"
                    >
                      Add Expense
                    </Button>
                  </form>
                </DialogContent>
              </Dialog>
            )}

            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button className="text-sm text-black font-bold font-mono bg-linear-90 from-yellow-500 to-orange-600">
                  <Plus size={16} className="mr-2" />
                  Limit
                </Button>
              </DialogTrigger>
              <DialogContent className="font-mono font-bold text-white bg-[#050505] border">
                <DialogHeader className="border-b p-2 flex justify-center items-center">
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
                    <Label htmlFor="period" className="text-zinc-300">
                      Period
                    </Label>
                    <select
                      id="period"
                      name="period"
                      className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-white"
                    >
                      <option value="month">Month</option>
                      <option value="year">Year</option>
                    </select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="limitAmount" className="text-zinc-300">
                      Amount limit (₽)
                    </Label>
                    <Input
                      id="limitAmount"
                      name="limitAmount"
                      type="number"
                      placeholder="100000"
                      required
                      className="[&::-webkit-inner-spin-button]:appearance-none bg-zinc-900 border-zinc-800 text-white"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="currency" className="text-zinc-300">
                      Currency
                    </Label>
                    <select
                      id="currency"
                      name="currency"
                      className="w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2 text-white"
                    >
                      <option value="RUB">₽ RUB</option>
                      <option value="USD">$ USD</option>
                      <option value="EUR">€ EUR</option>
                    </select>
                  </div>

                  <Button
                    type="submit"
                    className="w-full text-lg text-black font-bold font-mono bg-linear-90 from-yellow-500 to-orange-600 hover:scale-95 cursor-pointer"
                  >
                    Save
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
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
                  <div className="text-zinc-400 text-sm">
                    Spent this month
                  </div>
                  <div className="text-2xl font-bold text-white">
                    {spentThisMonth.toLocaleString("ru-RU")}{" "}
                    {currentMonthLimit.currency}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-zinc-400 text-sm">Limit</div>
                  <div className="text-2xl font-bold text-orange-500">
                    {currentMonthLimit.limitAmount.toLocaleString("ru-RU")}{" "}
                    {currentMonthLimit.currency}
                  </div>
                </div>
              </div>

              {/* Progress bar */}
              <div className="relative h-4 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className={`absolute top-0 left-0 h-full transition-all duration-500 ${
                    spentThisMonth / currentMonthLimit.limitAmount > 0.9
                      ? "bg-linear-to-r from-red-500 to-orange-500"
                      : "bg-linear-to-r from-yellow-500 to-orange-500"
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
                <span className="text-zinc-400">
                  Remaining:{" "}
                  <span className="text-white font-bold">
                    {(
                      currentMonthLimit.limitAmount - spentThisMonth
                    ).toLocaleString("ru-RU")}{" "}
                    {currentMonthLimit.currency}
                  </span>
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => deleteBudgetLimit(currentMonthLimit.id)}
                  className="text-zinc-400 hover:text-red-500"
                >
                  <Trash2 size={14} className="mr-1" />
                  Delete Limit
                </Button>
              </div>

              {/* Expenses List */}
              {expenses.length > 0 && (
                <div className="mt-6 pt-6 border-t border-zinc-800">
                  <h4 className="text-sm font-bold text-zinc-400 mb-3">Expenses This Month</h4>
                  <div className="space-y-2">
                    {expenses.map((expense) => (
                      <div
                        key={expense.id}
                        className="flex items-center justify-between p-3 bg-zinc-900 rounded-lg border border-zinc-800"
                      >
                        <div className="flex items-center gap-3">
                          <CreditCard className="w-4 h-4 text-zinc-500" />
                          <div>
                            <div className="font-medium text-white">{expense.title}</div>
                            <div className="text-xs text-zinc-500">
                              {expense.category} • {new Date(expense.date).toLocaleDateString("en-US", { month: 'short', day: 'numeric' })}
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <div className="font-bold text-orange-500">
                            {expense.amount.toLocaleString("ru-RU")} {currentMonthLimit.currency}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteExpense(expense.id)}
                            className="text-zinc-500 hover:text-red-500 h-8 w-8 p-0"
                          >
                            <Trash2 size={14} />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </AnimatedDiv>
        ) : (
          <div className="text-center text-zinc-500 py-8">
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
