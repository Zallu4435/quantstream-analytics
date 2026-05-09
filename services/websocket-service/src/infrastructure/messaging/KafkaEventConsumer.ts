// ────────────────────────────────────────────────────────────
// Infrastructure: KafkaEventConsumer
// ────────────────────────────────────────────────────────────

import type { EachMessagePayload } from "kafkajs";
import { BaseKafkaConsumer, type KafkaConsumerConfig } from "@crypto-analytics/contracts";

export class KafkaEventConsumer extends BaseKafkaConsumer {
  constructor(config: KafkaConsumerConfig) {
    super(config);
  }

  async start(onMessage: (payload: EachMessagePayload) => Promise<void>): Promise<void> {
    console.log(`🚀 [WebSocket] Starting high-performance batch consumer for ${this.topic}...`);
    await this.startBatch(onMessage);
    console.log(`📥 Consuming from topic: ${this.topic}`);
  }
}
