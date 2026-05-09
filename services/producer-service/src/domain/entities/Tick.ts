// ────────────────────────────────────────────────────────────
// Domain Entity: Tick
// ────────────────────────────────────────────────────────────
// Pure business object representing a market trade tick.

export interface TickProps {
  symbol: string;
  price: number;
  quantity: number;
  timestamp: number;
  tradeId: number;
  isBuyerMaker: boolean;
}

export class Tick {
  readonly symbol: string;
  readonly price: number;
  readonly quantity: number;
  readonly timestamp: number;
  readonly tradeId: number;
  readonly isBuyerMaker: boolean;

  constructor(props: TickProps) {
    this.symbol = props.symbol;
    this.price = props.price;
    this.quantity = props.quantity;
    this.timestamp = props.timestamp;
    this.tradeId = props.tradeId;
    this.isBuyerMaker = props.isBuyerMaker;
  }

  /** Partition key for Kafka (ordering guarantee per symbol) */
  get partitionKey(): string {
    return this.symbol.toUpperCase();
  }

  toJSON(): TickProps {
    return {
      symbol: this.symbol,
      price: this.price,
      quantity: this.quantity,
      timestamp: this.timestamp,
      tradeId: this.tradeId,
      isBuyerMaker: this.isBuyerMaker,
    };
  }
}
