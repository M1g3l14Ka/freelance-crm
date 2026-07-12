"use client";

import { usePathname, useRouter } from "next/navigation";
import { Button } from "@/shared/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/shared/ui/dropdown-menu";
import { CURRENCIES, CURRENCY_SYMBOLS, type Currency } from "@/lib/currency";
import { ChevronDown } from "lucide-react";

interface CurrencySelectorProps {
  currentCurrency: Currency;
}

export function CurrencySelector({ currentCurrency }: CurrencySelectorProps) {
  const router = useRouter();
  const pathname = usePathname();

  const handleSelect = (currency: string) => {
    router.push(`${pathname}?currency=${currency}`);
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          className="border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800"
        >
          {CURRENCY_SYMBOLS[currentCurrency]} {currentCurrency}
          <ChevronDown size={16} className="ml-2" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent className="bg-zinc-900 border-zinc-700">
        {CURRENCIES.map((currency) => (
          <DropdownMenuItem
            key={currency}
            onClick={() => handleSelect(currency)}
            className="text-white hover:bg-zinc-800 cursor-pointer"
          >
            {CURRENCY_SYMBOLS[currency]} {currency}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
