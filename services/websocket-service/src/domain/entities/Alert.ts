// ────────────────────────────────────────────────────────────
// Domain Entity: Alert
// ────────────────────────────────────────────────────────────

export interface AlertProps {
  symbol: string;
  type: string;
  message: string;
  price: number;
  threshold: number;
  timestamp: number;
}

export class Alert {
  readonly symbol: string;
  readonly type: string;
  readonly message: string;
  readonly price: number;
  readonly threshold: number;
  readonly timestamp: number;

  constructor(props: AlertProps) {
    this.symbol = props.symbol;
    this.type = props.type;
    this.message = props.message;
    this.price = props.price;
    this.threshold = props.threshold;
    this.timestamp = props.timestamp;
  }

  toJSON(): AlertProps {
    return {
      symbol: this.symbol,
      type: this.type,
      message: this.message,
      price: this.price,
      threshold: this.threshold,
      timestamp: this.timestamp,
    };
  }
}
