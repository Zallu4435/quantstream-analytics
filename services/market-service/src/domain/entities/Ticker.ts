// ────────────────────────────────────────────────────────────
// Domain Entity: Ticker
// ────────────────────────────────────────────────────────────
// Pure business object — NO framework dependencies.
// Represents the current market state for a trading pair.

export interface TickerProps {
  symbol: string;
  price: number;
  quantity: number;
  timestamp: number;
  tradeId: string | number;
}

export class Ticker {
  readonly symbol: string;
  readonly price: number;
  readonly quantity: number;
  readonly timestamp: number;
  readonly tradeId: string | number;

  constructor(props: TickerProps) {
    this.symbol = props.symbol;
    this.price = props.price;
    this.quantity = props.quantity;
    this.timestamp = props.timestamp;
    this.tradeId = props.tradeId;
  }

  /** Create a Ticker from a raw tick */
  static fromTick(
    symbol: string,
    price: number,
    quantity: number,
    timestamp: number,
    tradeId: string | number
  ): Ticker {
    return new Ticker({ symbol, price, quantity, timestamp, tradeId });
  }

  /** Serialize to a plain object (for Redis caching) */
  toJSON(): TickerProps {
    return {
      symbol: this.symbol,
      price: this.price,
      quantity: this.quantity,
      timestamp: this.timestamp,
      tradeId: this.tradeId,
    };
  }
}
