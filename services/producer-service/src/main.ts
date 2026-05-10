// ────────────────────────────────────────────────────────────
// Composition Root: main.ts
// ────────────────────────────────────────────────────────────
// This is the ONLY file that knows about ALL layers.
// It creates concrete implementations, injects them into
// use cases, and starts the service.

import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });

// ── Infrastructure ─────────────────────────────────────────
import { BinanceMarketStream } from "./infrastructure/external/BinanceMarketStream.js";
import { KafkaEventPublisher } from "./infrastructure/messaging/KafkaEventPublisher.js";

// ── Application ────────────────────────────────────────────
import { StreamMarketData } from "./application/use-cases/StreamMarketData.js";
import { PublishMarketTick } from "./application/use-cases/PublishMarketTick.js";

// ── Presentation ───────────────────────────────────────────
import { BinanceStreamHandler } from "./presentation/event-handlers/BinanceStreamHandler.js";

// ── Configuration ──────────────────────────────────────────
const config = {
  symbols: (process.env.SYMBOLS || "btcusdt,ethusdt,solusdt").split(","),
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
    topic: process.env.KAFKA_TOPIC || "raw-ticks",
    clientId: "producer-service",
  },
};

// ── Bootstrap ──────────────────────────────────────────────
async function bootstrap(): Promise<void> {
  console.log("🚀 Producer Service starting (Clean Architecture)...");

  // ── 1. Create Infrastructure ──────────────────────────
  const marketStream = new BinanceMarketStream();
  
  const eventPublisher = new KafkaEventPublisher({
    brokers: config.kafka.brokers,
    clientId: config.kafka.clientId,
    topic: config.kafka.topic,
  });

  await eventPublisher.connect();

  // ── 2. Create Use Cases (inject dependencies) ──────────
  const publishMarketTick = new PublishMarketTick({
    eventPublisher,
  });

  const streamMarketData = new StreamMarketData({
    marketStream,
  });

  // ── 3. Create Presentation Handler ────────────────────
  const binanceHandler = new BinanceStreamHandler({
    publishMarketTick,
  });

  // ── 4. Start Process (Bind Handler to Use Case) ───────
  streamMarketData.execute(config.symbols, (data) => binanceHandler.handle(data));

  // ── 5. Graceful Shutdown ──────────────────────────────
  async function shutdown(signal: string): Promise<void> {
    console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
    await streamMarketData.stop();
    await eventPublisher.disconnect();
    process.exit(0);
  }

  process.on("SIGINT", async () => await shutdown("SIGINT"));
  process.on("SIGTERM", async () => await shutdown("SIGTERM"));
}

bootstrap().catch((err) => {
  console.error("💥 Fatal error:", err);
  process.exit(1);
});
