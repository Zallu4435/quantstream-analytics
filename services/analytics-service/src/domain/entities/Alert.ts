// ────────────────────────────────────────────────────────────
// Domain Entity: Alert
// ────────────────────────────────────────────────────────────
// Pure business object — NO framework dependencies.
// Contains the alert detection business rule.

export type AlertType = "PRICE_SPIKE" | "PRICE_DROP" | "VOLUME_SURGE" | "WHALE_TRADE";

export interface AlertProps {
  type: AlertType;
  symbol: string;
  price: number;
  previousPrice: number;
  changePercent: number;
  timestamp: number;
  message: string;
}

export class Alert {
  readonly type: AlertType;
  readonly symbol: string;
  readonly price: number;
  readonly previousPrice: number;
  readonly changePercent: number;
  readonly timestamp: number;
  readonly message: string;

  constructor(props: AlertProps) {
    this.type = props.type;
    this.symbol = props.symbol;
    this.price = props.price;
    this.previousPrice = props.previousPrice;
    this.changePercent = props.changePercent;
    this.timestamp = props.timestamp;
    this.message = props.message;
  }

  /**
   * Evaluate whether a price change warrants an alert.
   * This is the core detection business rule.
   *
   * @returns Alert if threshold is breached, null otherwise.
   */
  static evaluate(
    symbol: string,
    currentPrice: number,
    previousPrice: number,
    threshold: number,
    timestamp: number
  ): Alert | null {
    // Time-decayed reference price (EWMA)
    const decayFactor = 0.99;
    const smoothedPrice = previousPrice * decayFactor + currentPrice * (1 - decayFactor);
    const changePercent = Math.abs((currentPrice - smoothedPrice) / smoothedPrice);

    if (changePercent < threshold) return null;

    const type: AlertType = currentPrice > smoothedPrice ? "PRICE_SPIKE" : "PRICE_DROP";

    return new Alert({
      type,
      symbol,
      price: currentPrice,
      previousPrice: smoothedPrice, // Use smoothed price as the baseline
      changePercent: changePercent * 100,
      timestamp,
      message: `${symbol} moved ${(changePercent * 100).toFixed(2)}% (${smoothedPrice.toFixed(4)} → ${currentPrice})`,
    });
  }

  /** Serialize to plain object (for Kafka) */
  toJSON(): AlertProps {
    return {
      type: this.type,
      symbol: this.symbol,
      price: this.price,
      previousPrice: this.previousPrice,
      changePercent: this.changePercent,
      timestamp: this.timestamp,
      message: this.message,
    };
  }
}
