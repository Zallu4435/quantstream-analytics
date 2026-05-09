// ────────────────────────────────────────────────────────────
// Composition Root: main.ts
// ────────────────────────────────────────────────────────────
// This is the ONLY file that knows about ALL layers.
// It creates concrete implementations, injects them into
// use cases, and starts the service.
//
// Dependency flow (Clean Architecture):
//
//   main.ts (wiring)
//     └→ presentation/event-handlers (validate + dispatch)
//         └→ application/use-cases (orchestrate business logic)
//             └→ domain/entities (pure business rules)
//
//   main.ts (wiring)
//     └→ infrastructure/* (concrete implementations)
//         └→ satisfy domain/repositories/* interfaces
// ────────────────────────────────────────────────────────────

import "dotenv/config";
import { Redis } from "ioredis";

// ── Shared Database (Prisma singleton from monorepo package) ─
import { prisma, disconnect as dbDisconnect } from "@crypto-analytics/database";

// ── Infrastructure ─────────────────────────────────────────
import { RedisCandleRepository } from "./infrastructure/cache/RedisCandleRepository.js";
import { PersistentAlertRepository } from "./infrastructure/database/PersistentAlertRepository.js";
import { KafkaAlertPublisher } from "./infrastructure/messaging/KafkaAlertPublisher.js";
import { KafkaCandlePublisher } from "./infrastructure/messaging/KafkaCandlePublisher.js";
import { KafkaTradeConsumer } from "./infrastructure/messaging/KafkaTradeConsumer.js";
import { createKafkaProducer } from "./infrastructure/messaging/KafkaProducerFactory.js";

// ── Application ────────────────────────────────────────────
import { UpdateCandleAggregation } from "./application/use-cases/UpdateCandleAggregation.js";
import { EvaluateAlert } from "./application/use-cases/EvaluateAlert.js";
import { FlushCompletedCandles } from "./application/use-cases/FlushCompletedCandles.js";

// ── Presentation ───────────────────────────────────────────
import { TradeEventHandler } from "./presentation/event-handlers/TradeEventHandler.js";

// ── Configuration ──────────────────────────────────────────
const config = {
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
    topicIn: process.env.KAFKA_TOPIC || "raw-ticks",
    topicAlerts: process.env.KAFKA_TOPIC_ALERTS || "alerts",
    topicCandles: process.env.KAFKA_TOPIC_CANDLES || "candles",
    groupId: process.env.KAFKA_GROUP_ID || "analytics-service-group",
    clientId: "analytics-service",
  },
  candle: {
    intervalMs: 60_000, // 1-minute candles
  },
  alert: {
    threshold: 0.02, // 2% price change
  },
  symbols: (process.env.SYMBOLS || "BTCUSDT,ETHUSDT,SOLUSDT").split(","),
};

// ── Bootstrap ──────────────────────────────────────────────
async function bootstrap(): Promise<void> {
  console.log("🚀 Analytics Service starting (Clean Architecture)...");

  // ── 1. Create Infrastructure ──────────────────────────
  const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
  console.log("✅ Local Redis client initialized");

  const alertProducer = await createKafkaProducer({
    brokers: config.kafka.brokers,
    clientId: `${config.kafka.clientId}-alerts`,
  });

  const candleProducer = await createKafkaProducer({
    brokers: config.kafka.brokers,
    clientId: `${config.kafka.clientId}-candles`,
  });

  const consumer = new KafkaTradeConsumer({
    brokers: config.kafka.brokers,
    groupId: config.kafka.groupId,
    topic: config.kafka.topicIn,
    clientId: config.kafka.clientId,
  });

  // ── 2. Create Repository Implementations ──────────────
  const candleRepository = new RedisCandleRepository(redis, prisma);
  const alertRepository = new PersistentAlertRepository(redis, prisma);
  const eventPublisher = new KafkaAlertPublisher(alertProducer, config.kafka.topicAlerts);
  const candlePublisher = new KafkaCandlePublisher(candleProducer, config.kafka.topicCandles);

  // ── 3. Create Use Cases (inject dependencies) ─────────
  const updateCandle = new UpdateCandleAggregation({
    candleRepository,
    candlePublisher,
    intervalMs: config.candle.intervalMs,
  });

  const evaluateAlert = new EvaluateAlert({
    alertRepository,
    eventPublisher,
    threshold: config.alert.threshold,
  });

  const flushCandles = new FlushCompletedCandles({
    candleRepository,
    intervalMs: config.candle.intervalMs,
    symbols: config.symbols,
  });

  // ── 4. Create Presentation Handler ────────────────────
  const tradeHandler = new TradeEventHandler({
    updateCandle,
    evaluateAlert,
  });

  // ── 5. Start Consumer (bind handler) ──────────────────
  await consumer.start((payload) => tradeHandler.handle(payload));
  console.log(`📤 Publishing alerts to topic: ${config.kafka.topicAlerts}`);

  // ── 6. Start Periodic Flush ───────────────────────────
  const flushInterval = setInterval(async () => {
    try {
      await flushCandles.execute();
    } catch (err) {
      console.error("[FlushCandles] Error:", err);
    }
  }, 10_000);

  // ── 7. Graceful Shutdown ──────────────────────────────
  async function shutdown(signal: string): Promise<void> {
    console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
    clearInterval(flushInterval);
    await consumer.disconnect();
    await alertProducer.disconnect();
    await candleProducer.disconnect();
    await redis.quit();
    await dbDisconnect();
    process.exit(0);
  }

  process.on("SIGINT", async () => await shutdown("SIGINT"));
  process.on("SIGTERM", async () => await shutdown("SIGTERM"));
}

bootstrap().catch((err) => {
  console.error("💥 Fatal error:", err);
  process.exit(1);
});
