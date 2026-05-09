// ────────────────────────────────────────────────────────────
// Infrastructure: KafkaAlertPublisher
// ────────────────────────────────────────────────────────────
// Concrete implementation of IAlertPublisher using KafkaJS.
// This file is the ONLY place that knows about Kafka for publishing.

import type { Producer } from "kafkajs";
import type { Alert } from "../../domain/entities/Alert.js";
import type { IAlertPublisher } from "../../domain/repositories/IAlertPublisher.js";

export class KafkaAlertPublisher implements IAlertPublisher {
  constructor(
    private readonly producer: Producer,
    private readonly topic: string
  ) {}

  async publishAlert(alert: Alert): Promise<void> {
    await this.producer.send({
      topic: this.topic,
      messages: [
        {
          key: alert.symbol,
          value: JSON.stringify(alert.toJSON()),
          timestamp: String(alert.timestamp),
        },
      ],
    });
  }
}
