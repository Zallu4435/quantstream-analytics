// Domain Repository Interface: IMarketDataPublisher
// ───────────────────────────────────────────────────────────
// Defines the contract for publishing market data events.

import type { Tick } from "../entities/Tick.js";

export interface IMarketDataPublisher {
  /** Publish a market tick event */
  publishTick(tick: Tick): Promise<void>;

  /** Disconnect from the publisher */
  disconnect(): Promise<void>;
}