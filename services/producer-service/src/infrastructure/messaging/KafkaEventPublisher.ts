// ────────────────────────────────────────────────────────────
// Infrastructure: KafkaEventPublisher
// ────────────────────────────────────────────────────────────
// Concrete implementation of IMarketDataPublisher using Kafka.

import { Kafka, type Producer, Partitioners } from "kafkajs";
import type { Tick } from "../../domain/entities/Tick.js";
import type { IMarketDataPublisher } from "../../domain/repositories/IMarketDataPublisher.js";

export interface KafkaPublisherConfig {
  brokers: string[];
  clientId: string;
  topic: string;
}

export class KafkaEventPublisher implements IMarketDataPublisher {
  private producer: Producer;
  private readonly topic: string;

  constructor(config: KafkaPublisherConfig) {
    const kafka = new Kafka({
      clientId: config.clientId,
      brokers: config.brokers,
      retry: { initialRetryTime: 300, retries: 10 },
    });

    this.producer = kafka.producer({
      allowAutoTopicCreation: true,
      createPartitioner: Partitioners.DefaultPartitioner,
    });
    this.topic = config.topic;
  }

  async connect(): Promise<void> {
    await this.producer.connect();
    console.log("✅ Kafka publisher connected");
  }

  async publishTick(tick: Tick): Promise<void> {
    await this.producer.send({
      topic: this.topic,
      messages: [
        {
          key: tick.partitionKey,
          value: JSON.stringify(tick.toJSON()),
          timestamp: String(tick.timestamp),
        },
      ],
    });
  }

  async disconnect(): Promise<void> {
    await this.producer.disconnect();
  }
}
