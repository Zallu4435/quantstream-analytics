// ────────────────────────────────────────────────────────────
// Presentation: TradeEventHandler
// ────────────────────────────────────────────────────────────
// Maps incoming Kafka messages to Application Use Cases.
//
// Responsibilities:
// 1. Deserialize raw Kafka message
// 2. Validate with Zod DTO (validation at the edge)
// 3. Dispatch to use cases
//
// This handler has NO business logic. It is a thin adapter
// between the messaging infrastructure and the application layer.

import type { EachMessagePayload } from "kafkajs";
import { RawTickSchema } from "../../application/dtos/RawTickDTO.js";
import type { UpdateCandleAggregation } from "../../application/use-cases/UpdateCandleAggregation.js";
import type { EvaluateAlert } from "../../application/use-cases/EvaluateAlert.js";

interface TradeEventHandlerDeps {
  updateCandle: UpdateCandleAggregation;
  evaluateAlert: EvaluateAlert;
}

export class TradeEventHandler {
  private readonly updateCandle: UpdateCandleAggregation;
  private readonly evaluateAlert: EvaluateAlert;

  constructor(deps: TradeEventHandlerDeps) {
    this.updateCandle = deps.updateCandle;
    this.evaluateAlert = deps.evaluateAlert;
  }

  /**
   * Handle a single Kafka message.
   * This is the function passed to KafkaTradeConsumer.start().
   */
  async handle({ message }: EachMessagePayload): Promise<void> {
    if (!message.value) return;

    // 1. Deserialize
    const raw = JSON.parse(message.value.toString());

    // 2. Validate at the edge (Zod DTO)
    const result = RawTickSchema.safeParse(raw);
    if (!result.success) {
      console.error("[TradeEventHandler] Invalid message:", result.error.format());
      return;
    }

    const tick = result.data;

    // 3. Dispatch to use cases (parallel — they are independent)
    await Promise.all([
      this.updateCandle.execute(tick),
      this.evaluateAlert.execute(tick),
    ]);
  }
}
