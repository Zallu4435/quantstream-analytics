// ────────────────────────────────────────────────────────────
// Domain Entity: Tick
// ────────────────────────────────────────────────────────────

export interface TickProps {
  symbol: string;
  price: number;
  quantity: number;
  timestamp: number;
  isBuyerMaker: boolean;
}

export class Tick {
  readonly symbol: string;
  readonly price: number;
  readonly quantity: number;
  readonly timestamp: number;
  readonly isBuyerMaker: boolean;

  constructor(props: TickProps) {
    this.symbol = props.symbol;
    this.price = props.price;
    this.quantity = props.quantity;
    this.timestamp = props.timestamp;
    this.isBuyerMaker = props.isBuyerMaker;
  }

  toJSON(): TickProps {
    return {
      symbol: this.symbol,
      price: this.price,
      quantity: this.quantity,
      timestamp: this.timestamp,
      isBuyerMaker: this.isBuyerMaker,
    };
  }
}
