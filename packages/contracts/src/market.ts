// ────────────────────────────────────────────────────────────
// @crypto-analytics/contracts — Market Data Types
// ────────────────────────────────────────────────────────────

/**
 * Raw trade tick from Binance WebSocket.
 * Produced by: producer-service
 * Consumed by: market-service, analytics-service
 */
export interface RawTick {
  /** Trading pair symbol (e.g., "BTCUSDT") */
  symbol: string;
  /** Trade price */
  price: number;
  /** Trade quantity */
  quantity: number;
  /** Trade timestamp (Unix ms) */
  timestamp: number;
  /** Binance trade ID */
  tradeId: number;
  /** Whether the buyer is the market maker */
  isBuyerMaker: boolean;
}

/**
 * Aggregated OHLCV candle.
 * Produced by: analytics-service
 * Stored in: TimescaleDB (Aiven), Redis (cache)
 */
export interface Candle {
  /** Trading pair symbol */
  symbol: string;
  /** Candle interval (e.g., "1m", "5m", "1h") */
  interval: string;
  /** Candle open timestamp (Unix ms) */
  openTime: number;
  /** Candle close timestamp (Unix ms) */
  closeTime: number;
  /** Opening price */
  open: number;
  /** Highest price */
  high: number;
  /** Lowest price */
  low: number;
  /** Closing price */
  close: number;
  /** Total traded volume */
  volume: number;
  /** Number of trades in this candle */
  tradeCount: number;
}

/**
 * Real-time alert event triggered by analytics-service.
 * Published via: Redis Pub/Sub → websocket-service → clients
 */
export interface AlertEvent {
  /** Alert type */
  type: "PRICE_SPIKE" | "PRICE_DROP" | "VOLUME_SURGE" | "WHALE_TRADE";
  /** Trading pair symbol */
  symbol: string;
  /** Current price at time of alert */
  price: number;
  /** Previous reference price */
  previousPrice: number;
  /** Percentage change that triggered the alert */
  changePercent: number;
  /** Alert timestamp (Unix ms) */
  timestamp: number;
  /** Human-readable alert message */
  message: string;
}
