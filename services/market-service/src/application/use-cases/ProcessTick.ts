// ────────────────────────────────────────────────────────────
// Application Use Case: ProcessTick
// ────────────────────────────────────────────────────────────
// Single Responsibility: Update the latest market state from a tick.
//
// Flow:
// 1. Build a Ticker entity from the tick
// 2. Cache it in Redis (latest ticker + sorted set entry)
//
// NEVER imports Kafka, Redis, or any framework directly.

import { Ticker } from "../../domain/entities/Ticker.js";
import type { ITickerRepository } from "../../domain/repositories/ITickerRepository.js";
import type { TickDTO } from "../dtos/TickDTO.js";

interface ProcessTickDeps {
  tickerRepository: ITickerRepository;
  tickerTtlSeconds: number;
}

export class ProcessTick {
  private readonly tickerRepo: ITickerRepository;
  private readonly tickerTtlSeconds: number;

  constructor(deps: ProcessTickDeps) {
    this.tickerRepo = deps.tickerRepository;
    this.tickerTtlSeconds = deps.tickerTtlSeconds;
  }

  async execute(tick: TickDTO): Promise<Ticker> {
    // 1. Build domain entity
    const ticker = Ticker.fromTick(
      tick.symbol,
      tick.price,
      tick.quantity,
      tick.timestamp,
      tick.tradeId
    );

    // 2. Cache latest ticker and record price in sorted set
    await Promise.all([
      this.tickerRepo.saveTicker(ticker, this.tickerTtlSeconds),
      this.tickerRepo.recordPrice(tick.symbol, tick.price, tick.timestamp, tick.tradeId),
    ]);

    return ticker;
  }
}
