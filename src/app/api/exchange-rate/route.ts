import { NextResponse } from "next/server";
import { getExchangeRate, CURRENCIES } from "@/lib/currency";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const from = searchParams.get("from") || "RUB";
    const to = searchParams.get("to") || "USD";

    if (!CURRENCIES.includes(from as any) || !CURRENCIES.includes(to as any)) {
      return NextResponse.json({ error: "Invalid currency" }, { status: 400 });
    }

    const rate = await getExchangeRate(from as any, to as any);
    
    return NextResponse.json({ from, to, rate, timestamp: new Date().toISOString() });
  } catch (error) {
    console.error("Exchange rate API error:", error);
    return NextResponse.json({ error: "Failed to get exchange rate" }, { status: 500 });
  }
}
