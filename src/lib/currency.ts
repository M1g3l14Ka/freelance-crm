import { prisma } from "./prisma";

export type Currency = "RUB" | "USD" | "EUR" | "KZT" | "BYN";

export const CURRENCIES: readonly Currency[] = ["RUB", "USD", "EUR", "KZT", "BYN"];

export function isCurrency(value: string): value is Currency {
  return CURRENCIES.some((currency) => currency === value);
}

export const CURRENCY_SYMBOLS: Record<Currency, string> = {
  RUB: "₽",
  USD: "$",
  EUR: "€",
  KZT: "₸",
  BYN: "Br",
};

/**
 * Get exchange rate from database or API
 */
export async function getExchangeRate(
  from: Currency,
  to: Currency
): Promise<number> {
  if (from === to) return 1;

  // Check in database
  const cachedRate = await prisma.exchangeRate.findUnique({
    where: {
      baseCurrency_targetCurrency: {
        baseCurrency: from,
        targetCurrency: to,
      },
    },
  });

  // If exists and updated in last 24 hours
  if (cachedRate) {
    const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
    if (new Date(cachedRate.updatedAt) > oneDayAgo) {
      return cachedRate.rate;
    }
  }

  try {
    const response = await fetch(
      `https://api.exchangerate-api.com/v4/latest/${from}`
    );
    const data = await response.json();
    const rate = data.rates[to] || 1;

    // Save to database
    await prisma.exchangeRate.upsert({
      where: {
        baseCurrency_targetCurrency: {
          baseCurrency: from,
          targetCurrency: to,
        },
      },
      update: { rate, source: "exchangerate-api" },
      create: {
        baseCurrency: from,
        targetCurrency: to,
        rate,
        source: "exchangerate-api",
      },
    });

    return rate;
  } catch (error) {
    console.error("Failed to fetch exchange rate:", error);
    return cachedRate?.rate || 1;
  }
}


export async function convertCurrency(
  amount: number,
  from: Currency,
  to: Currency
): Promise<number> {
  const rate = await getExchangeRate(from, to);
  return amount * rate;
}


export async function convertProjectsToCurrency<T extends { grossIncome: number; currency: string }>(
  projects: T[],
  targetCurrency: Currency
): Promise<number> {
  let total = 0;
  for (const project of projects) {
    const converted = await convertCurrency(
      project.grossIncome,
      project.currency as Currency,
      targetCurrency
    );
    total += converted;
  }
  return total;
}


export function formatCurrency(amount: number, currency: Currency): string {
  const symbol = CURRENCY_SYMBOLS[currency];
  return `${amount.toLocaleString("ru-RU")} ${symbol}`;
}


