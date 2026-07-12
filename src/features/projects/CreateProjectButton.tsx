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
                    className="text-lg text-black font-bold font-mono bg-linear-90 from-yellow-500 to-orange-600 hover:scale-95 cursor-pointer m-2"
                >
                    Add project
                </Button>
            </DialogTrigger>
            <DialogContent className="font-mono font-bold text-white bg-[#050505] border">
                <DialogHeader className="border-b p-2 flex justify-center items-center">
                    <DialogTitle>New project</DialogTitle>
                </DialogHeader>

                <form action={handleSubmit} className="space-y-4 pt-4">
                    <div className="space-y-2">
                        <Label htmlFor="title" className="text-zinc-300">Project/Task name</Label>
                        <Input
                            id="title"
                            name="title"
                            placeholder="Create a card.."
                            required
                            className="bg-zinc-900 border-zinc-800 text-white"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="grossIncome" className="text-zinc-300">Task cost</Label>
                        <Input
                            id="grossIncome"
                            name="grossIncome"
                            type="number"
                            placeholder="The amount for the task (figures only)"
                            required
                            className="[&::-webkit-inner-spin-button]:appearance-none bg-zinc-900 border-zinc-800 text-white"
                        />
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="currency" className="text-zinc-300">Currency</Label>
                        <div className="flex gap-2 flex-wrap">
                            {CURRENCIES.map((curr) => (
                                <Button
                                    key={curr}
                                    type="button"
                                    onClick={() => setCurrency(curr)}
                                    variant={currency === curr ? "default" : "outline"}
                                    className={
                                        currency === curr
                                            ? "bg-orange-500 hover:bg-orange-600 text-black font-bold"
                                            : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800"
                                    }
                                >
                                    {CURRENCY_SYMBOLS[curr]} {curr}
                                </Button>
                            ))}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="taxRate" className="text-zinc-300">Tax rate(%)</Label>
                        <div className="flex gap-2 p-2 bg-zinc-900 rounded-lg">
                            {[3, 6, 13].map((rate) => (
                                <Button
                                    key={rate}
                                    type="button"
                                    onClick={() => setTaxRate(rate)}
                                    variant={taxRate === rate ? "default" : "outline"}
                                    className={
                                        taxRate === rate
                                            ? "bg-orange-500 hover:bg-orange-600 text-black font-bold"
                                            : "border-zinc-700 bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-800"
                                    }
                                >
                                    {rate}%
                                </Button>
                            ))}
                        </div>
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
    );
}




