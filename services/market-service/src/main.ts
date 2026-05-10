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

import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
import { Redis } from "ioredis";
import { prisma, disconnect as disconnectPrisma } from "@crypto-analytics/database";

// ── Infrastructure ─────────────────────────────────────────
import { RedisTickerRepository } from "./infrastructure/cache/RedisTickerRepository.js";
import { KafkaMarketConsumer } from "./infrastructure/messaging/KafkaMarketConsumer.js";

// ── Application ────────────────────────────────────────────
import { ProcessTick } from "./application/use-cases/ProcessTick.js";

// ── Presentation ───────────────────────────────────────────
import { MarketDataHandler } from "./presentation/event-handlers/MarketDataHandler.js";

// ── Configuration ──────────────────────────────────────────
const config = {
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
    topic: process.env.KAFKA_TOPIC || "raw-ticks",
    groupId: process.env.KAFKA_GROUP_ID || "market-service-group",
    clientId: "market-service",
  },
  ticker: {
    ttlSeconds: 300, // 5 minutes
  },
  database: {
    batchSize: 100, // Persist trades in batches of 100
  },
};

// ── Bootstrap ──────────────────────────────────────────────
async function bootstrap(): Promise<void> {
  console.log("🚀 Market Service starting (Clean Architecture)...");

  // ── 1. Create Infrastructure ──────────────────────────
  const redis = new Redis(process.env.REDIS_URL || "redis://localhost:6379");
  console.log("✅ Local Redis client initialized");

  const consumer = new KafkaMarketConsumer({
    brokers: config.kafka.brokers,
    groupId: config.kafka.groupId,
    topic: config.kafka.topic,
    clientId: config.kafka.clientId,
  });

  const tickerRepository = new RedisTickerRepository(redis);

  // ── 2. Create Use Cases (inject dependencies) ─────────
  const processTick = new ProcessTick({
    tickerRepository,
    tickerTtlSeconds: config.ticker.ttlSeconds,
  });

  console.log("✅ Use cases initialized (ProcessTick)");

  // ── 3. Create Presentation Handler ────────────────────
  const marketDataHandler = new MarketDataHandler({
    processTick,
  });

  // ── 4. Start Consumer (bind handler) ──────────────────
  await consumer.start((payload) => marketDataHandler.handle(payload));

  // ── 5. Start Periodic Flush ───────────────────────────
  // Note: PersistTrades has been removed for the public platform
  // to avoid crashing the database with raw ticks.

  // ── 6. Graceful Shutdown ──────────────────────────────
  async function shutdown(signal: string): Promise<void> {
    console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);


    await consumer.disconnect();
    await redis.quit();
    await disconnectPrisma();

    process.exit(0);
  }

  process.on("SIGINT", async () => await shutdown("SIGINT"));
  process.on("SIGTERM", async () => await shutdown("SIGTERM"));
}

bootstrap().catch((err) => {
  console.error("💥 Fatal error:", err);
  process.exit(1);
});
