"use client"

import { useState, useEffect } from "react"
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
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const handleSubmit = async (formData: FormData) => {
    await createSubscription(formData)
    setOpen(false)
  }

  if (!mounted) {
    return (
      <Button
        className="text-sm text-black font-bold font-mono bg-linear-90 from-yellow-500 to-orange-600"
        disabled
      >
        <Plus size={16} className="mr-2" />
        Subscription
      </Button>
    )
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="text-sm text-black font-bold font-mono bg-linear-90 from-yellow-500 to-orange-600">
          <Plus size={16} className="mr-2" />
          Subscription
        </Button>
      </DialogTrigger>
      <DialogContent className="font-mono font-bold text-white bg-[#050505] border">
        <DialogHeader className="border-b p-2 flex justify-center items-center">
          <DialogTitle>New Subscription</DialogTitle>
        </DialogHeader>

        <form action={handleSubmit} className="space-y-4 pt-4">
          <div className="space-y-2">
            <Label htmlFor="title" className="text-zinc-300">
              Title
            </Label>
            <Input
              id="title"
              name="title"
              placeholder="Yandex, Mobile phone..."
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
              placeholder="500"
              required
              className="[&::-webkit-inner-spin-button]:appearance-none bg-zinc-900 border-zinc-800 text-white"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="intervalDays" className="text-zinc-300">
              Interval (days)
            </Label>
            <Input
              id="intervalDays"
              name="intervalDays"
              type="number"
              defaultValue="30"
              required
              className="[&::-webkit-inner-spin-button]:appearance-none bg-zinc-900 border-zinc-800 text-white"
            />
            <p className="text-xs text-zinc-500">
              30 days, 31 days, 28 days, etc.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="nextPaymentDate" className="text-zinc-300">
              Next payment date
            </Label>
            <Input
              id="nextPaymentDate"
              name="nextPaymentDate"
              type="date"
              required
              className="bg-zinc-900 border-zinc-800 text-white"
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
  )
}

