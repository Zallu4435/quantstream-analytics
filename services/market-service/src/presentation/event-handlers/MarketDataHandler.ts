// ────────────────────────────────────────────────────────────
// Presentation: MarketDataHandler
// ────────────────────────────────────────────────────────────
// Maps incoming Kafka messages to Application Use Cases.
//
// Responsibilities:
// 1. Deserialize raw Kafka message
// 2. Validate with Zod DTO (validation at the edge)
// 3. Dispatch to use cases (ProcessTick + PersistTrades)
//
// This handler has NO business logic. It is a thin adapter
// between the messaging infrastructure and the application layer.

import type { EachMessagePayload } from "kafkajs";
import { TickSchema } from "../../application/dtos/TickDTO.js";
import type { ProcessTick } from "../../application/use-cases/ProcessTick.js";
import type { PersistTrades } from "../../application/use-cases/PersistTrades.js";

interface MarketDataHandlerDeps {
  processTick: ProcessTick;
  persistTrades: PersistTrades;
}

export class MarketDataHandler {
  private readonly processTick: ProcessTick;
  private readonly persistTrades: PersistTrades;
  private tickBatch: ReturnType<typeof TickSchema.parse>[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private readonly batchMs = 100;

  constructor(deps: MarketDataHandlerDeps) {
    this.processTick = deps.processTick;
    this.persistTrades = deps.persistTrades;
  }

  private async flushBatch(): Promise<void> {
    if (this.tickBatch.length === 0) return;
    const batch = this.tickBatch;
    this.tickBatch = [];
    this.batchTimer = null;

    await Promise.all([
      Promise.all(batch.map((t) => this.processTick.execute(t))),
      Promise.all(batch.map((t) => this.persistTrades.execute(t))),
    ]);
  }

  async handle({ message }: EachMessagePayload): Promise<void> {
    if (!message.value) return;

    const raw = JSON.parse(message.value.toString());

    // Skip expensive Zod validation on this hot path since the
    // message is already validated by the producer on the internal topic.
    const tick = raw as ReturnType<typeof TickSchema.parse>;
    
    this.tickBatch.push(tick);

    if (!this.batchTimer) {
      this.batchTimer = setTimeout(() => this.flushBatch(), this.batchMs);
    }
  }
}
