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

  /**
   * Apply a new tick to this candle, updating OHLCV values.
   * This is the core aggregation business rule.
   */
  applyTick(price: number, quantity: number): void {
    this.high = Math.max(this.high, price);
    this.low = Math.min(this.low, price);
    this.close = price;
    this.volume += quantity;
    this.tradeCount += 1;
  }

  /** Check if this candle's time window has closed */
  isComplete(now: number): boolean {
    return now > this.closeTime;
  }

  /** Create a new Candle for the start of a window */
  static create(
    symbol: string,
    interval: string,
    intervalMs: number,
    openTime: number,
    firstPrice: number,
    firstQuantity: number
  ): Candle {
    return new Candle({
      symbol,
      interval,
      openTime,
      closeTime: openTime + intervalMs - 1,
      open: firstPrice,
      high: firstPrice,
      low: firstPrice,
      close: firstPrice,
      volume: firstQuantity,
      tradeCount: 1,
    });
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
