// ────────────────────────────────────────────────────────────
// Domain Repository Interface: ITradeRepository
// ────────────────────────────────────────────────────────────
// Defines the contract for persisting trades to long-term storage.
// Infrastructure layer provides the concrete implementation.

import type { Trade } from "../entities/Trade.js";

export interface ITradeRepository {
  /** Persist a single trade (used for buffered batch inserts) */
  create(trade: Trade): Promise<Trade>;

  /** Persist multiple trades in a batch */
  createMany(trades: Trade[]): Promise<number>;
}
