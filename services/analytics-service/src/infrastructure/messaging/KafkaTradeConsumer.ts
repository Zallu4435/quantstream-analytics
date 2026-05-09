// ────────────────────────────────────────────────────────────
// Infrastructure: KafkaTradeConsumer
// ────────────────────────────────────────────────────────────
// Manages the Kafka consumer lifecycle.
// Decoupled from business logic — it only parses raw messages
// and delegates to an onMessage callback.

import type { EachMessagePayload } from "kafkajs";
import { BaseKafkaConsumer, type KafkaConsumerConfig } from "@crypto-analytics/contracts";

export class KafkaTradeConsumer extends BaseKafkaConsumer {
  constructor(config: KafkaConsumerConfig) {
    super(config);
  }

  // Override start to use high-performance batch processing by default
  async start(onMessage: (payload: EachMessagePayload) => Promise<void>): Promise<void> {
    console.log("🚀 [Analytics] Starting high-performance batch consumer...");
    await this.startBatch(onMessage);
    console.log(`📊 Consuming from topic: ${this.topic}`);
  }
}
