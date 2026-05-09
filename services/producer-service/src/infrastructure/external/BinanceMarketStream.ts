// ────────────────────────────────────────────────────────────
// Infrastructure: BinanceMarketStream
// ────────────────────────────────────────────────────────────
// Concrete implementation of IMarketDataStream using Binance WebSockets.
//
// This layer ONLY handles "Plumbing" (connecting, errors, raw data).
// It does NOT know about DTOs or Entities.

import WebSocket from "ws";
import PQueue from "p-queue";
import CircuitBreaker from "opossum";
import type { IMarketDataStream } from "../../domain/repositories/IMarketDataStream.js";

const queue = new PQueue({ concurrency: 10, autoStart: true });

export class BinanceMarketStream implements IMarketDataStream {
  private ws: WebSocket | null = null;
  private readonly baseUrl = "wss://stream.binance.com:9443/stream";
  private reconnectCount = 0;
  private readonly MAX_RECONNECT_ATTEMPTS = 50;
  private breaker: CircuitBreaker;

  constructor() {
    this.breaker = new CircuitBreaker(this.connect.bind(this), {
      timeout: 10000,
      errorThresholdPercentage: 50,
      resetTimeout: 30000,
    });

    this.breaker.on('open', () => console.warn("🚧 Circuit breaker OPEN: Binance API unavailable"));
    this.breaker.on('halfOpen', () => console.warn("🚧 Circuit breaker HALF_OPEN: Testing Binance API"));
    this.breaker.on('close', () => console.log("✅ Circuit breaker CLOSED: Binance API functional"));
  }

  /**
   * Subscribe to the stream and emit RAW data strings to the callback.
   */
  subscribe(symbols: string[], onMessage: (data: string) => Promise<void>): void {
    const streams = symbols.map((s) => `${s.toLowerCase()}@trade`).join("/");
    const url = `${this.baseUrl}?streams=${streams}`;

    console.log(`📡 Connecting to Binance: ${url} (Attempt ${this.reconnectCount + 1})`);
    
    this.breaker.fire(url, symbols, onMessage).catch((err) => {
      console.error("❌ Circuit breaker rejected connection:", err.message);
      // The circuit breaker itself doesn't stop us from trying again later, 
      // but it fails fast during an outage. We can schedule a retry.
      setTimeout(() => this.subscribe(symbols, onMessage), 10000);
    });
  }

  private connect(url: string, symbols: string[], onMessage: (data: string) => Promise<void>): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.ws) {
        this.ws.removeAllListeners();
        this.ws.terminate();
      }

      this.ws = new WebSocket(url);

      this.ws.on("open", () => {
        console.log("✅ Binance WebSocket connected");
        this.reconnectCount = 0;
        resolve();
      });

      this.ws.on("message", (data) => {
        if (queue.size < 1000) {
          queue.add(async () => {
            try {
              await onMessage(data.toString());
            } catch (err) {
              console.error("[BinanceMarketStream] Message processing error:", err);
            }
          });
        } else {
          console.warn("[BinanceMarketStream] Backpressure queue full, dropping message");
        }
      });

      this.ws.on("error", (err) => {
        console.error("[BinanceMarketStream] WS Error:", err.message);
        reject(err);
      });

      this.ws.on("close", (code, reason) => {
        if (this.reconnectCount >= this.MAX_RECONNECT_ATTEMPTS) {
          console.error("❌ Max reconnect attempts reached. Stream stopped.");
          return;
        }

        const delay = Math.min(1000 * Math.pow(2, this.reconnectCount), 30000) + Math.floor(Math.random() * 1000);
        console.warn(
          `[BinanceMarketStream] Disconnected (${code}): ${reason.toString()}. ` +
          `Reconnecting in ${delay}ms...`
        );

        this.reconnectCount++;
        setTimeout(() => this.subscribe(symbols, onMessage), delay);
      });
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.removeAllListeners();
      this.ws.terminate();
      this.ws = null;
    }
  }
}
