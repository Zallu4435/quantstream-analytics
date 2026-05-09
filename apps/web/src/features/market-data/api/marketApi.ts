/**
 * Market data API calls.
 * These are for REST-based historical data fetching.
 * Live data flows through the WebSocket/Zustand pipeline.
 */

import { api } from "@/shared/lib/api";
import type { Candle } from "@crypto-analytics/contracts";

/** Fetch historical candles for a symbol */
export async function fetchCandles(
  symbol: string,
  interval: string = "1m",
  limit: number = 100
): Promise<Candle[]> {
  return api.get<Candle[]>(
    `/market/candles?symbol=${symbol}&interval=${interval}&limit=${limit}`
  );
}

/** Fetch the latest ticker snapshot for all symbols */
export async function fetchTickers(): Promise<
  Record<string, { price: string; quantity: string; timestamp: string }>
> {
  return api.get(`/market/tickers`);
}
