"use client"

import { useState } from "react"
import { Button } from "@/shared/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog"
import { Input } from "@/shared/ui/input"
import { Label } from "@/shared/ui/label"
import { createSubscription } from "./actions"
import { Plus } from "lucide-react"

export function CreateSubscriptionBtn() {
  const [open, setOpen] = useState(false)

  const handleSubmit = async (formData: FormData) => {
    await createSubscription(formData)
    setOpen(false)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus size={16} className="mr-2" />
          Subscription
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader className="border-b border-border pb-4">
          <DialogTitle>New Subscription</DialogTitle>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="title">
              Title
            </Label>
            <Input
              id="title"
              name="title"
              placeholder="Yandex, Mobile phone..."
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
              placeholder="500"
              required
              className="[&::-webkit-inner-spin-button]:appearance-none"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="intervalDays">
              Interval (days)
            </Label>
            <Input
              id="intervalDays"
              name="intervalDays"
              type="number"
              defaultValue="30"
              required
              className="[&::-webkit-inner-spin-button]:appearance-none"
            />
            <p className="text-xs text-text-muted">
              30 days, 31 days, 28 days, etc.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nextPaymentDate">
              Next payment date
            </Label>
            <Input
              id="nextPaymentDate"
              name="nextPaymentDate"
              type="date"
              required
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
    </Dialog>
  )
}
