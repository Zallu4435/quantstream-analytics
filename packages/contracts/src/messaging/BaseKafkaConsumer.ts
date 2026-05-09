import { Kafka, type Consumer, type EachMessagePayload, type EachBatchPayload } from "kafkajs";

export interface KafkaConsumerConfig {
  brokers: string[];
  groupId: string;
  topic: string;
  clientId: string;
}

export abstract class BaseKafkaConsumer {
  protected consumer: Consumer;
  protected topic: string;

  constructor(config: KafkaConsumerConfig) {
    const kafka = new Kafka({
      clientId: config.clientId,
      brokers: config.brokers,
    });

    this.consumer = kafka.consumer({ groupId: config.groupId });
    this.topic = config.topic;

    // ── 9.3 Handle Consumer Crashes ─────────────────────
    this.consumer.on("consumer.crash", (event) => {
      console.error(`[${config.clientId}] 💥 Consumer crashed:`, event.payload.error);
      process.exit(1);
    });
  }

  /**
   * Start the consumer using eachMessage (simpler, but slower)
   */
  async start(onMessage: (payload: EachMessagePayload) => Promise<void>): Promise<void> {
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: this.topic, fromBeginning: false });

    await this.consumer.run({
      eachMessage: async (payload) => {
        try {
          await onMessage(payload);
        } catch (err) {
          console.error(`[KafkaConsumer] Error processing message on ${this.topic}:`, err);
        }
      },
    });
  }

  /**
   * Start the consumer using eachBatch (🚀 HIGH PERFORMANCE)
   * Addresses Issue 5.2
   */
  async startBatch(onMessage: (payload: EachMessagePayload) => Promise<void>): Promise<void> {
    await this.consumer.connect();
    await this.consumer.subscribe({ topic: this.topic, fromBeginning: false });

    await this.consumer.run({
      eachBatch: async ({ batch, resolveOffset, heartbeat, isRunning, isStale }: EachBatchPayload) => {
        // Parallel processing within a batch
        await Promise.all(
          batch.messages.map(async (message) => {
            if (!isRunning() || isStale()) return;
            
            await onMessage({ 
              topic: batch.topic, 
              partition: batch.partition, 
              message,
              heartbeat,
              pause: () => () => {}, // Dummy pause
            });
            
            resolveOffset(message.offset);
          })
        );
        await heartbeat();
      },
    });
  }

  async disconnect(): Promise<void> {
    await this.consumer.disconnect();
  }
}
