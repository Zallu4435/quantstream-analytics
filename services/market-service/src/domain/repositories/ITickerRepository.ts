// ────────────────────────────────────────────────────────────
// Domain Repository Interface: ITickerRepository
// ────────────────────────────────────────────────────────────
// Defines the contract for caching latest market prices.
// Infrastructure layer provides the concrete implementation.

import type { Ticker } from "../entities/Ticker.js";

export interface ITickerRepository {
  /** Cache the latest ticker for a symbol (with optional TTL in seconds) */
  saveTicker(ticker: Ticker, ttlSeconds: number): Promise<void>;

  /** Retrieve the latest cached ticker for a symbol */
  getTicker(symbol: string): Promise<Ticker | null>;

  /** Add a price entry to the sorted set of latest prices */
  recordPrice(symbol: string, price: number, timestamp: number, tradeId: string | number): Promise<void>;
}
