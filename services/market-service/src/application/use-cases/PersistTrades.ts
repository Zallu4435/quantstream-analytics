// ────────────────────────────────────────────────────────────
// Application Use Case: PersistTrades
// ────────────────────────────────────────────────────────────
// Single Responsibility: Buffer incoming ticks and flush them
// to persistent storage (Postgres via Prisma) in batches.
//
// Flow:
// 1. Accumulate ticks into an in-memory buffer
// 2. Flush the buffer to the repository when it reaches capacity
// 3. Provide a manual flush method for graceful shutdown
//
// NEVER imports Prisma directly — depends on the ITradeRepository interface.

import { Trade } from "../../domain/entities/Trade.js";
import type { ITradeRepository } from "../../domain/repositories/ITradeRepository.js";
import type { TickDTO } from "../dtos/TickDTO.js";

interface PersistTradesDeps {
  tradeRepository: ITradeRepository;
  batchSize: number;
}

export class PersistTrades {
  private readonly tradeRepo: ITradeRepository;
  private readonly batchSize: number;
  private buffer: Trade[] = [];

  constructor(deps: PersistTradesDeps) {
    this.tradeRepo = deps.tradeRepository;
    this.batchSize = deps.batchSize;
  }

  /** Accumulate a tick into the buffer; flush if batch size is reached. */
  async execute(tick: TickDTO): Promise<void> {
    const trade = Trade.fromTick(
      tick.symbol,
      tick.price,
      tick.quantity,
      tick.timestamp,
      tick.tradeId,
      tick.isBuyerMaker
    );

    this.buffer.push(trade);

    if (this.buffer.length >= this.batchSize) {
      await this.flush();
    }
  }

  /** Flush the current buffer immediately. */
  async flush(): Promise<number> {
    if (this.buffer.length === 0) return 0;

    const batch = this.buffer.splice(0, this.buffer.length);
    const maxRetries = 3;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        const count = await this.tradeRepo.createMany(batch);
        console.log(`💾 Persisted ${count} trades to database`);
        return count;
      } catch (err) {
        if (attempt === maxRetries) {
          console.error(`[PersistTrades] Batch insert failed after ${maxRetries} attempts. Dropping batch.`, err);
          throw err;
        }
        
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        console.warn(`[PersistTrades] Batch insert failed, retrying in ${delay}ms (Attempt ${attempt}/${maxRetries})...`);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
    return 0;
  }

  /** Current number of buffered trades */
  get bufferedCount(): number {
    return this.buffer.length;
  }
}
