// ────────────────────────────────────────────────────────────
// Application Use Case: StreamMarketData
// ────────────────────────────────────────────────────────────
// Single Responsibility: Connect a market stream to a generic handler.
//
// This use case coordinates the lifecycle of the stream.

import type { IMarketDataStream } from "../../domain/repositories/IMarketDataStream.js";

interface StreamMarketDataDeps {
  marketStream: IMarketDataStream;
}

export class StreamMarketData {
  private readonly marketStream: IMarketDataStream;

  constructor(deps: StreamMarketDataDeps) {
    this.marketStream = deps.marketStream;
  }

  /**
   * Start the streaming process for the given symbols.
   * Delegates the actual message processing to the onMessage handler.
   */
  execute(symbols: string[], onMessage: (data: string) => Promise<void>): void {
    console.log(`📡 Starting market data stream for: ${symbols.join(", ")}`);
    this.marketStream.subscribe(symbols, onMessage);
  }

  /**
   * Stop the streaming process.
   */
  async stop(): Promise<void> {
    this.marketStream.disconnect();
  }
}
