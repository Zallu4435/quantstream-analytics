// ────────────────────────────────────────────────────────────
// Application Use Case: FlushCompletedCandles
// ────────────────────────────────────────────────────────────
// Single Responsibility: Find and flush completed candle windows.
// Called periodically by the flush timer in main.ts.

import { Candle } from "../../domain/entities/Candle.js";
import type { ICandleRepository } from "../../domain/repositories/ICandleRepository.js";

interface FlushCandleDeps {
  candleRepository: ICandleRepository;
  intervalMs: number;
  symbols: string[];
}

export class FlushCompletedCandles {
  private readonly candleRepo: ICandleRepository;
  private readonly intervalMs: number;
  private readonly symbols: string[];

  constructor(deps: FlushCandleDeps) {
    this.candleRepo = deps.candleRepository;
    this.intervalMs = deps.intervalMs;
    this.symbols = deps.symbols;
  }

  async execute(): Promise<Candle[]> {
    const now = Date.now();
    const flushed: Candle[] = [];
    const prevIntervalStart =
      Math.floor(now / this.intervalMs) * this.intervalMs - this.intervalMs;

    for (const symbol of this.symbols) {
      const candle = await this.candleRepo.getWindow(
        symbol.toUpperCase(),
        prevIntervalStart
      );

      if (candle && candle.isComplete(now)) {
        console.log(
          `📦 Flushed candle: ${candle.symbol} ` +
          `O:${candle.open} H:${candle.high} ` +
          `L:${candle.low} C:${candle.close} ` +
          `V:${candle.volume.toFixed(4)} T:${candle.tradeCount}`
        );

        try {
          // Persist first to avoid data loss
          await this.candleRepo.persistCandle(candle);
          await this.candleRepo.deleteWindow(symbol.toUpperCase(), prevIntervalStart);
          flushed.push(candle);
        } catch (err) {
          console.error(`❌ Failed to flush candle for ${symbol}:`, err);
        }
      }
    }

    return flushed;
  }
}
