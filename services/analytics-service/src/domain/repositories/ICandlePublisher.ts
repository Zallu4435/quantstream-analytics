// ────────────────────────────────────────────────────────────
// Domain Repository Interface: ICandlePublisher
// ────────────────────────────────────────────────────────────

export interface CandleData {
  symbol: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  timestamp: number;
}

export interface ICandlePublisher {
  /** Publish an aggregated candle event */
  publishCandle(candle: CandleData): Promise<void>;
  
  /** Disconnect from the publisher */
  disconnect(): Promise<void>;
}
