'use client'

import { Button } from "@/shared/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/shared/ui/dialog";
import { Input } from "@/shared/ui/input";
import { Label } from "@/shared/ui/label";
import { createProject } from "./actions";
import { useState } from "react";
import { CURRENCIES, CURRENCY_SYMBOLS } from "@/lib/currency";

export function CreateProjectBtn() {
    const [open, setOpen] = useState(false);
    const [taxRate, setTaxRate] = useState(6);
    const [currency, setCurrency] = useState("RUB");

    const handleSubmit = async (formData: FormData) => {
        formData.set('taxRate', taxRate.toString());
        formData.set('currency', currency);
        await createProject(formData)
        setOpen(false);
        setTaxRate(6);
        setCurrency("RUB");
    }

    return (
        <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
                <Button
                    size="lg"
                >
                    Add project
                </Button>
            </DialogTrigger>
            <DialogContent>
                <DialogHeader className="border-b border-border pb-4">
                    <DialogTitle>New project</DialogTitle>
                </DialogHeader>

                <form action={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="title">Project/Task name</Label>
                        <Input
                            id="title"
                            name="title"
                            placeholder="Create a card.."
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="grossIncome">Task cost</Label>
                        <Input
                            id="grossIncome"
                            name="grossIncome"
                            type="number"
                            placeholder="The amount for the task (figures only)"
                            required
                            className="[&::-webkit-inner-spin-button]:appearance-none"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="currency">Currency</Label>
                        <div className="flex gap-2 flex-wrap">
                            {CURRENCIES.map((curr) => (
                                <Button
                                    key={curr}
                                    type="button"
                                    onClick={() => setCurrency(curr)}
                                    variant={currency === curr ? "default" : "outline"}
                                    className={
                                        currency === curr
                                            ? "bg-accent text-accent-foreground hover:bg-accent-hover"
                                            : ""
                                    }
                                >
                                    {CURRENCY_SYMBOLS[curr]} {curr}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="taxRate">Tax rate (%)</Label>
                        <div className="app-segment">
                            {[3, 6, 13].map((rate) => (
                                <Button
                                    key={rate}
                                    type="button"
                                    onClick={() => setTaxRate(rate)}
                                    variant={taxRate === rate ? "default" : "outline"}
                                    className={
                                        taxRate === rate
                                            ? "bg-accent text-accent-foreground hover:bg-accent-hover"
                                            : ""
                                    }
                                >
                                    {rate}%
                                </Button>
                            ))}
                        </div>
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
    );
}




