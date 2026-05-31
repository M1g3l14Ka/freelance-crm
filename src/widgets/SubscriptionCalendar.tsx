"use client"

import { useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/shared/ui/card"
import { Button } from "@/shared/ui/button"
import { Subscription } from "@prisma/client"
import { updateSubscriptionDates, deleteSubscription } from "@/features/subscriptions/actions"
import { Calendar, Trash2 } from "lucide-react"
import { AnimatedDiv } from "@/shared/ui/animated"

interface SubscriptionCalendarProps {
  subscriptions: Subscription[]
}

export function SubscriptionCalendar({ subscriptions }: SubscriptionCalendarProps) {
  useEffect(() => {
    // Check and update payment dates on load
    updateSubscriptionDates()
  }, [])

  const getDaysUntilPayment = (nextPaymentDate: Date) => {
    const today = new Date()
    const paymentDate = new Date(nextPaymentDate)
    const diffTime = paymentDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getStatusColor = (days: number) => {
    if (days < 0) return "text-red-500 bg-red-500/10"
    if (days <= 3) return "text-orange-500 bg-orange-500/10"
    return "text-green-500 bg-green-500/10"
  }

  const getStatusText = (days: number) => {
    if (days < 0) return `Overdue by ${Math.abs(days)} days`
    if (days === 0) return "Pay today!"
    if (days === 1) return "Pay tomorrow"
    return `In ${days} days`
  }

  const sortedSubscriptions = [...subscriptions].sort(
    (a, b) =>
      new Date(a.nextPaymentDate).getTime() -
      new Date(b.nextPaymentDate).getTime()
  )

  return (
    <Card className="bg-[#050505] border-zinc-800">
      <CardHeader>
        <CardTitle className="text-2xl font-bold text-transparent bg-clip-text bg-linear-60 from-yellow-500 to-orange-600">
          Payment Calendar
        </CardTitle>
      </CardHeader>
      <CardContent>
        {sortedSubscriptions.length > 0 ? (
          <div className="space-y-3">
            {sortedSubscriptions.map((sub, index) => {
              const days = getDaysUntilPayment(sub.nextPaymentDate)
              const statusColor = getStatusColor(days)

              return (
                <AnimatedDiv key={sub.id} delay={index * 0.05}>
                  <div
                    className={`flex items-center justify-between p-4 rounded-lg border ${
                      days <= 0
                        ? "border-red-500/50 bg-red-500/5"
                        : days <= 3
                        ? "border-orange-500/50 bg-orange-500/5"
                        : "border-zinc-800 bg-zinc-900/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Calendar
                        className={`w-5 h-5 ${
                          days <= 0
                            ? "text-red-500"
                            : days <= 3
                            ? "text-orange-500"
                            : "text-zinc-400"
                        }`}
                      />
                      <div>
                        <div className="font-bold text-white">{sub.title}</div>
                        <div className="text-sm text-zinc-400">
                          {sub.amount.toLocaleString("ru-RU")} {sub.currency} •
                          Interval: {sub.intervalDays} days
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div
                        className={`px-3 py-1 rounded-full text-xs font-bold ${statusColor}`}
                      >
                        {getStatusText(days)}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteSubscription(sub.id)}
                        className="text-zinc-400 hover:text-red-500"
                      >
                        <Trash2 size={16} />
                      </Button>
                    </div>
                  </div>
                </AnimatedDiv>
              )
            })}
          </div>
        ) : (
          <div className="text-center text-zinc-500 py-8">
            No active subscriptions
          </div>
        )}
      </CardContent>
    </Card>
  )
}


