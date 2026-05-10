# CryptoOps Analytics Platform

A high-performance, real-time cryptocurrency analytics terminal built with a robust microservices architecture. It ingests live WebSocket data from Binance, processes it through distributed Kafka queues, caches hot data in Redis, and persists time-series data into TimescaleDB for historical analysis.

## 🚀 Architecture

The platform is designed around Clean Architecture and Event-Driven patterns to handle thousands of ticks per second without blocking the event loop or dropping data.

### Services (Turborepo Monorepo)
* **`apps/api-gateway`**: Express.js edge gateway with structured Pino logging, request ID tracing, and rate limiting.
* **`apps/web`**: React + Vite frontend featuring a bespoke "Technical/HUD" design system. Uses Zustand for lightweight global state, Framer Motion for hardware-accelerated micro-animations, and Lightweight Charts for real-time 1s order flow aggregation.
* **`services/producer-service`**: Ingests raw ticks from Binance WS. Protected by an Opossum Circuit Breaker and an in-memory backpressure queue (`p-queue`) to gracefully survive upstream outages and network spikes.
* **`services/market-service`**: Consumes raw ticks via Kafkajs `eachBatch` for high-throughput parallel processing. Aggregates data and updates real-time ticker caches in Redis for the API Gateway.
* **`services/analytics-service`**: Processes ticks into 1-minute OHLCV candles and evaluates them against global price alerts using an Exponentially Weighted Moving Average (EWMA). Includes automated TimescaleDB cleanup cron jobs.
* **`services/websocket-service`**: Dedicated Socket.IO broadcasting service that pushes deduplicated, finalized candles and alerts to the React frontend.

### Infrastructure & Data Layer
* **Kafka**: Distributed event streaming (Topics: `raw-ticks`, `candles`, `alerts`).
* **Redis**: Fast key-value store for active sessions and real-time ticker caches.
* **TimescaleDB / PostgreSQL**: Optimized for time-series data storage (`candles` and `alerts` hypertables), accessed via Prisma ORM. Automated 30-day retention policies ensure the database remains lightweight.

## 🛠️ Getting Started

### Prerequisites
* Node.js v18+
* pnpm v9+
* Docker & Docker Compose (for Kafka, Zookeeper, Redis, and PostgreSQL)

### Installation & Execution
1. **Install dependencies:**
   ```bash
   pnpm install
   ```

2. **Start Infrastructure (Docker):**
   ```bash
   # Make sure your docker daemon is running, then spin up the DBs and Message Broker
   docker-compose up -d
   ```

3. **Database Migrations:**
   ```bash
   cd packages/database
   npx prisma generate
   npx prisma migrate dev
   ```

4. **Build & Run the Platform:**
   ```bash
   pnpm run build
   pnpm run dev
   ```

The web dashboard will be available at `http://localhost:5173`.

## 🛡️ Production Hardening
This platform has been thoroughly audited and hardened for production:
* **Memory Leaks Sealed**: React StrictMode double-mounting Socket.IO listeners and Zustand store unbounded growth have been resolved.
* **Event-Loop Optimized**: Removed heavy Zod runtime validations from hot-paths (internal trusted Kafka topics).
* **Resilience**: Integrated exponential backoff DB retry mechanisms to survive temporary database connection drops.
* **Tracing**: Propagated `x-request-id` headers through Edge proxy down to internal structured logs.
