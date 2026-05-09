// ────────────────────────────────────────────────────────────
// Infrastructure: KafkaProducerFactory
// ────────────────────────────────────────────────────────────
// Creates and connects a Kafka producer instance.

import { Kafka, type Producer } from "kafkajs";

export interface KafkaProducerConfig {
  brokers: string[];
  clientId: string;
}

export async function createKafkaProducer(config: KafkaProducerConfig): Promise<Producer> {
  const kafka = new Kafka({
    clientId: config.clientId,
    brokers: config.brokers,
    retry: { initialRetryTime: 300, retries: 10 },
  });

  const producer = kafka.producer({ allowAutoTopicCreation: true });
  await producer.connect();
  console.log("✅ Kafka alert producer connected");

  return producer;
}
