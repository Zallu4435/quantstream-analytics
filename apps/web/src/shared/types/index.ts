/**
 * Frontend-specific types.
 * Prefer importing from @crypto-analytics/contracts for shared types.
 * These types extend the shared contracts with UI-specific fields.
 */

import type { RawTick, Candle, AlertEvent } from "@crypto-analytics/contracts";

// Re-export shared types for convenience
export type { RawTick, Candle, AlertEvent };

/** Ticker state for a single symbol in the Zustand store */
export interface TickerState {
  symbol: string;
  price: number;
  previousPrice: number;
  quantity: number;
  timestamp: number;
  isBuyerMaker: boolean;
  /** Direction of last price change */
  direction: "up" | "down" | "neutral";
}

/** Alert with UI-specific metadata */
export interface AlertWithMeta extends AlertEvent {
  id: string;
  read: boolean;
  receivedAt: number;
}

/** Connection status for the WebSocket */
export type ConnectionStatus = "connected" | "disconnected" | "connecting" | "error";
