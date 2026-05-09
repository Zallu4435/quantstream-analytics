// ────────────────────────────────────────────────────────────
// Application Use Case: UpdateCandleAggregation
// ────────────────────────────────────────────────────────────
// Single Responsibility: Aggregate a tick into the current candle window.
//
// This use case NEVER imports Kafka, Redis, or any framework.
// It depends only on domain entities and repository INTERFACES
// which are injected via the constructor.

import { Candle } from "../../domain/entities/Candle.js";
import type { ICandleRepository } from "../../domain/repositories/ICandleRepository.js";
import type { ICandlePublisher } from "../../domain/repositories/ICandlePublisher.js";
import type { RawTickDTO } from "../dtos/RawTickDTO.js";

interface UpdateCandleDeps {
  candleRepository: ICandleRepository;
  candlePublisher: ICandlePublisher;
  intervalMs: number;
}

export class UpdateCandleAggregation {
  private readonly candleRepo: ICandleRepository;
  private readonly candlePublisher: ICandlePublisher;
  private readonly intervalMs: number;

  constructor(deps: UpdateCandleDeps) {
    this.candleRepo = deps.candleRepository;
    this.candlePublisher = deps.candlePublisher;
    this.intervalMs = deps.intervalMs;
  }

  private lastPublishTimes = new Map<string, number>();

  async execute(tick: RawTickDTO): Promise<Candle> {
    const intervalStart = Math.floor(tick.timestamp / this.intervalMs) * this.intervalMs;
    const ttl = Math.ceil(this.intervalMs / 1000) + 120;

    // 🚀 Atomic aggregation in Redis (prevents race conditions)
    const candleProps = await this.candleRepo.updateAggregation(
      tick.symbol,
      tick.price,
      tick.quantity,
      intervalStart,
      ttl
    );

    const candle = new Candle(candleProps);

    // 2. Throttled publish to Kafka (Performance)
    const now = Date.now();
    const lastPublish = this.lastPublishTimes.get(tick.symbol) || 0;

    if (now - lastPublish >= 1000) {
      await this.candlePublisher.publishCandle({
        symbol: candle.symbol,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
        timestamp: candle.openTime,
      });
      this.lastPublishTimes.set(tick.symbol, now);
    }

    return candle;
  }
}
