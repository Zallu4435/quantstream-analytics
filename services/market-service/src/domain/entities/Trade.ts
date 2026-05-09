// ────────────────────────────────────────────────────────────
// Domain Entity: Trade
// ────────────────────────────────────────────────────────────
// Pure business object — NO framework dependencies.
// Represents a single historical trade to be persisted.

export interface TradeProps {
  id?: string;
  symbol: string;
  price: number;
  quantity: number;
  timestamp: Date;
  tradeId: string | number;
  isBuyerMaker: boolean;
}

export class Trade {
  readonly id?: string;
  readonly symbol: string;
  readonly price: number;
  readonly quantity: number;
  readonly timestamp: Date;
  readonly tradeId: string | number;
  readonly isBuyerMaker: boolean;

  constructor(props: TradeProps) {
    this.id = props.id;
    this.symbol = props.symbol;
    this.price = props.price;
    this.quantity = props.quantity;
    this.timestamp = props.timestamp;
    this.tradeId = props.tradeId;
    this.isBuyerMaker = props.isBuyerMaker;
  }

  /** Create a Trade from a validated tick DTO */
  static fromTick(
    symbol: string,
    price: number,
    quantity: number,
    timestamp: number,
    tradeId: string | number,
    isBuyerMaker: boolean
  ): Trade {
    return new Trade({
      symbol,
      price,
      quantity,
      timestamp: new Date(timestamp),
      tradeId,
      isBuyerMaker,
    });
  }
}
