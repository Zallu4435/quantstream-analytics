// ────────────────────────────────────────────────────────────
// Domain Repository Interface: IMarketDataStream
// ────────────────────────────────────────────────────────────
// Defines the contract for receiving real-time market data.

export interface IMarketDataStream {
  /** Subscribe to trades for a list of symbols and receive raw message strings */
  subscribe(symbols: string[], onMessage: (data: string) => Promise<void>): void;
  
  /** Disconnect from the stream */
  disconnect(): void;
}
