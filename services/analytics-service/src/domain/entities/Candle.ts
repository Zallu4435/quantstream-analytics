// ────────────────────────────────────────────────────────────
// Domain Entity: Candle
// ────────────────────────────────────────────────────────────
// Pure business object — NO framework dependencies.
// Contains the aggregation logic that is the core of this service.

export interface CandleProps {
  symbol: string;
  interval: string;
  openTime: number;
  closeTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  tradeCount: number;
}

export class Candle {
  readonly symbol: string;
  readonly interval: string;
  readonly openTime: number;
  readonly closeTime: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  tradeCount: number;

  constructor(props: CandleProps) {
    this.symbol = props.symbol;
    this.interval = props.interval;
    this.openTime = props.openTime;
    this.closeTime = props.closeTime;
    this.open = props.open;
    this.high = props.high;
    this.low = props.low;
    this.close = props.close;
    this.volume = props.volume;
    this.tradeCount = props.tradeCount;
  }

  /** Check if this candle's time window has closed */
  isComplete(now: number): boolean {
    return now > this.closeTime;
  }

  /** Serialize to plain object (for Redis/Kafka) */
  toJSON(): CandleProps {
    return {
      symbol: this.symbol,
      interval: this.interval,
      openTime: this.openTime,
      closeTime: this.closeTime,
      open: this.open,
      high: this.high,
      low: this.low,
      close: this.close,
      volume: this.volume,
      tradeCount: this.tradeCount,
    };
  }
}
