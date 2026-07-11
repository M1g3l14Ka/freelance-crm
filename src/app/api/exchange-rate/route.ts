import { NextResponse } from "next/server";
import { getExchangeRate, isCurrency, type Currency } from "@/lib/currency";

type ExchangeRateResponse = {
  from: Currency;
  to: Currency;
  rate: number;
  timestamp: string;
};

type ExchangeRateErrorResponse = {
  error: string;
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from") ?? "RUB";
    const to = searchParams.get("to") ?? "USD";

    if (!isCurrency(from) || !isCurrency(to)) {
      return NextResponse.json<ExchangeRateErrorResponse>(
        { error: "Invalid currency" },
        { status: 400 }
      );
    }

    const rate = await getExchangeRate(from, to);
    
    return NextResponse.json<ExchangeRateResponse>({
      from,
      to,
      rate,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error("Exchange rate API error:", error);
    return NextResponse.json<ExchangeRateErrorResponse>(
      { error: "Failed to get exchange rate" },
      { status: 500 }
    );
  }
}
