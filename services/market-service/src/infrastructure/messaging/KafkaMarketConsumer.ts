// ────────────────────────────────────────────────────────────
// Infrastructure: KafkaMarketConsumer
// ────────────────────────────────────────────────────────────
// Manages the Kafka consumer lifecycle for market ticks.
// Decoupled from business logic — it only parses raw messages
// and delegates to an onMessage callback.

import type { EachMessagePayload } from "kafkajs";
import { BaseKafkaConsumer, type KafkaConsumerConfig } from "@crypto-analytics/contracts";

export class KafkaMarketConsumer extends BaseKafkaConsumer {
  constructor(config: KafkaConsumerConfig) {
    super(config);
  }

  async start(onMessage: (payload: EachMessagePayload) => Promise<void>): Promise<void> {
    console.log("🚀 [Market] Starting high-performance batch consumer for market ticks...");
    await this.startBatch(onMessage);
    console.log(`📥 Consuming from topic: ${this.topic}`);
  }
}
