// ────────────────────────────────────────────────────────────
// Infrastructure: KafkaCandlePublisher
// ────────────────────────────────────────────────────────────

import type { Producer } from "kafkajs";
import type { ICandlePublisher, CandleData } from "../../domain/repositories/ICandlePublisher.js";

export class KafkaCandlePublisher implements ICandlePublisher {
  constructor(
    private readonly producer: Producer,
    private readonly topic: string
  ) {}

  async publishCandle(candle: CandleData): Promise<void> {
    await this.producer.send({
      topic: this.topic,
      messages: [
        {
          key: candle.symbol,
          value: JSON.stringify(candle),
        },
      ],
    });
  }

  async disconnect(): Promise<void> {
    // Shared producer is disconnected in main.ts
  }
}
