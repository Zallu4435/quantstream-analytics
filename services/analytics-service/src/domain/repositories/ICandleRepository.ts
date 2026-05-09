// ────────────────────────────────────────────────────────────
// Domain Repository Interface: ICandleRepository
// ────────────────────────────────────────────────────────────
// Defines the contract for candle persistence.
// Infrastructure layer provides the concrete implementation.

import type { Candle, CandleProps } from "../entities/Candle.js";

export interface ICandleRepository {
  /** Get the current (in-progress) candle for a symbol + window */
  getWindow(symbol: string, intervalStart: number): Promise<Candle | null>;

  /** Atomic update of a candle window (prevents race conditions) */
  updateAggregation(
    symbol: string, 
    price: number, 
    quantity: number, 
    intervalStart: number, 
    ttlSeconds: number
  ): Promise<CandleProps>;

  /** Save/update the current candle window */
  saveWindow(candle: Candle, ttlSeconds: number): Promise<void>;

  /** Update the "latest" pointer for quick reads by other services */
  saveLatest(candle: Candle): Promise<void>;

  /** Delete a completed window after it has been flushed */
  deleteWindow(symbol: string, intervalStart: number): Promise<void>;

  /** Persist a completed candle to long-term storage (Postgres) */
  persistCandle(candle: Candle): Promise<void>;
}
