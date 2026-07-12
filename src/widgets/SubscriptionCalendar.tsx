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
  readOnly?: boolean
}

export function SubscriptionCalendar({ subscriptions, readOnly = false }: SubscriptionCalendarProps) {
  useEffect(() => {
    if (readOnly) return
    // Check and update payment dates on load
    updateSubscriptionDates()
  }, [readOnly])

  const getDaysUntilPayment = (nextPaymentDate: Date) => {
    const today = new Date()
    const paymentDate = new Date(nextPaymentDate)
    const diffTime = paymentDate.getTime() - today.getTime()
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
    return diffDays
  }

  const getStatusColor = (days: number) => {
    if (days < 0) return "border-destructive/20 bg-destructive/10 text-destructive"
    if (days <= 3) return "border-warning/20 bg-warning/10 text-warning"
    return "border-success/20 bg-success/10 text-success"
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
    <Card>
      <CardHeader>
        <CardTitle>
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
                        ? "border-destructive/20 bg-destructive/5"
                        : days <= 3
                        ? "border-warning/20 bg-warning/5"
                        : "border-border bg-surface-elevated/50"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Calendar
                        className={`w-5 h-5 ${
                          days <= 0
                            ? "text-destructive"
                            : days <= 3
                            ? "text-warning"
                            : "text-text-secondary"
                        }`}
                      />
                      <div>
                        <div className="font-medium text-text-primary">{sub.title}</div>
                        <div className="text-sm text-text-secondary">
                          {sub.amount.toLocaleString("ru-RU")} {sub.currency} •
                          Interval: {sub.intervalDays} days
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div
                        className={`rounded-full border px-3 py-1 text-xs font-medium ${statusColor}`}
                      >
                        {getStatusText(days)}
                      </div>
                      {!readOnly && (
                        <Button
                          size="icon"
                          onClick={() => deleteSubscription(sub.id)}
                          variant="destructive"
                          className="text-destructive"
                        >
                          <Trash2 size={16} />
                        </Button>
                      )}
                    </div>
                  </div>
                </AnimatedDiv>
              )
            })}
          </div>
        ) : (
          <div className="py-10 text-center text-text-muted">
            No active subscriptions
          </div>
        )}
      </CardContent>
    </Card>
  )
}

