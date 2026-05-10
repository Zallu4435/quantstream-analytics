// ────────────────────────────────────────────────────────────
// Composition Root: main.ts
// ────────────────────────────────────────────────────────────

import path from "path";
import dotenv from "dotenv";
dotenv.config({ path: path.resolve(process.cwd(), "../../.env") });
import { createServer } from "http";
import express from "express";
import helmet from "helmet";
import { rateLimit } from "express-rate-limit";
import { Server } from "socket.io";

// ── Infrastructure ─────────────────────────────────────────
import { KafkaEventConsumer } from "./infrastructure/messaging/KafkaEventConsumer.js";
import { SocketIOBroadcaster } from "./infrastructure/realtime/SocketIOBroadcaster.js";

// ── Application ────────────────────────────────────────────
import { BroadcastTick } from "./application/use-cases/BroadcastTick.js";
import { BroadcastAlert } from "./application/use-cases/BroadcastAlert.js";

// ── Presentation ───────────────────────────────────────────
import { TickEventHandler } from "./presentation/event-handlers/TickEventHandler.js";
import { AlertEventHandler } from "./presentation/event-handlers/AlertEventHandler.js";
import { ConnectionHandler } from "./presentation/socket-handlers/ConnectionHandler.js";

// ── Configuration ──────────────────────────────────────────
const config = {
  port: parseInt(process.env.WS_PORT || "4100", 10),
  corsOrigin: (() => {
    const origin = process.env.CORS_ORIGIN || "*";
    if (process.env.NODE_ENV === "production" && origin === "*") {
      throw new Error("CORS_ORIGIN must be explicitly set in production (currently '*')");
    }
    return origin;
  })(),
  kafka: {
    brokers: (process.env.KAFKA_BROKERS || "localhost:9092").split(","),
    topicTicks: process.env.KAFKA_TOPIC || "raw-ticks",
    topicAlerts: process.env.KAFKA_TOPIC_ALERTS || "alerts",
    clientId: "websocket-service",
  },
};

// ── Bootstrap ──────────────────────────────────────────────
async function bootstrap(): Promise<void> {
  console.log("🚀 WebSocket Service starting (Clean Architecture)...");

  // ── 1. Initialize Express + HTTP + Socket.IO ──────────
  const app = express();
  const httpServer = createServer(app);

  // Security middleware
  app.set("trust proxy", 1);
  app.use(helmet({
    hsts: {
      maxAge: 31536000,
      preload: true,
    }
  }));

  // Rate limiting for the handshake (HTTP part of Socket.IO)
  const wsLimiter = rateLimit({
    windowMs: 60 * 1000,
    max: 30, // Max 30 connections per IP per minute
    standardHeaders: true,
    legacyHeaders: false,
    keyGenerator: (req) => req.ip || "unknown",
  });

  app.use(wsLimiter);

  // Health check route
  app.get("/health", async (_req, res) => {
    try {
      res.json({
        status: "healthy",
        service: "websocket-service",
        timestamp: new Date().toISOString(),
        connections: io.engine.clientsCount,
      });
    } catch {
      res.status(503).json({ status: "unhealthy", service: "websocket-service" });
    }
  });

  const io = new Server(httpServer, {
    cors: { origin: config.corsOrigin, methods: ["GET", "POST"] },
  });

  // ── 2. Create Infrastructure ──────────────────────────
  const broadcaster = new SocketIOBroadcaster(io);
  
  const tickConsumer = new KafkaEventConsumer({
    brokers: config.kafka.brokers,
    groupId: "websocket-ticks-group",
    topic: config.kafka.topicTicks,
    clientId: config.kafka.clientId,
  });

  const alertConsumer = new KafkaEventConsumer({
    brokers: config.kafka.brokers,
    groupId: "websocket-alerts-group",
    topic: config.kafka.topicAlerts,
    clientId: config.kafka.clientId,
  });

  // ── 3. Create Use Cases ───────────────────────────────
  const broadcastTick = new BroadcastTick({ broadcaster });
  const broadcastAlert = new BroadcastAlert({ broadcaster });

  // ── 4. Create Presentation Handlers ───────────────────
  const tickEventHandler = new TickEventHandler({ broadcastTick });
  const alertEventHandler = new AlertEventHandler({ broadcastAlert });
  const connectionHandler = new ConnectionHandler(io);

  // ── 5. Wire up Socket.IO ──────────────────────────────
  io.on("connection", (socket) => connectionHandler.handleConnection(socket));

  // ── 6. Start Kafka Consumers ──────────────────────────
  await Promise.all([
    tickConsumer.start((payload) => tickEventHandler.handle(payload)),
    alertConsumer.start((payload) => alertEventHandler.handle(payload)),
  ]);

  // ── 7. Start Server ───────────────────────────────────
  httpServer.listen(config.port, () => {
    console.log(`🚀 WebSocket Service listening on http://localhost:${config.port}`);
  });

  // ── 8. Graceful Shutdown ──────────────────────────────
  async function shutdown(signal: string): Promise<void> {
    console.log(`\n🛑 Received ${signal}. Shutting down...`);
    io.close();
    await Promise.allSettled([
      tickConsumer.disconnect(),
      alertConsumer.disconnect(),
    ]);
    httpServer.close();
    process.exit(0);
  }

  process.on("SIGINT", async () => await shutdown("SIGINT"));
  process.on("SIGTERM", async () => await shutdown("SIGTERM"));
}

bootstrap().catch((err) => {
  console.error("💥 Fatal error:", err);
  process.exit(1);
});
