# Crypto Analytics Platform — Comprehensive Code Review

> **Scope:** Full-stack monorepo (API Gateway, Auth Service, Producer Service, Market Service, Analytics Service, WebSocket Service, Web Frontend, Shared Packages)

---

## Table of Contents

1. [Critical Security Issues](#1-critical-security-issues)
2. [Logic Errors & Broken Functionality](#2-logic-errors--broken-functionality)
3. [Memory Leaks](#3-memory-leaks)
4. [Performance Bottlenecks](#4-performance-bottlenecks)
5. [Excessive Resource Usage](#5-excessive-resource-usage)
6. [Poor Coding Practices](#6-poor-coding-practices)
7. [Architecture & Scalability Issues](#7-architecture--sca lability-issues)
8. [Database & Storage Issues](#8-database--storage-issues)
9. [Async Handling & Concurrency](#9-async-handling--concurrency)
10. [Duplicate & Dead Code](#10-duplicate--dead-code)
11. [Dependency & Build Issues](#11-dependency--build-issues)
12. [Frontend-Specific Issues](#12-frontend-specific-issues)
13. [Summary & Priority Action Items](#13-summary--priority-action-items)

---

## 1. Critical Security Issues

### 1.1 Hardcoded JWT Fallback Secret (CRITICAL) ✅ FIXED
**Files:**
- `apps/api-gateway/src/middleware/auth.ts:4`
- `services/auth-service/src/main.ts:45`

**Issue:** Both the API Gateway and Auth Service fall back to a hardcoded, predictable JWT secret (`"dev-secret-change-in-production"`) when `JWT_SECRET` is not set.

**Impact:** If the environment variable is missing in any deployed environment (staging, prod), attackers can forge JWTs and impersonate any user.

**Fix:**
```typescript
// ❌ BAD
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";

// ✅ GOOD
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
  throw new Error("JWT_SECRET environment variable is required");
}
```

---

### 1.2 CORS Origin Wildcard in Production (HIGH) ✅ FIXED
**Files:**
- `apps/api-gateway/src/index.ts:19`
- `services/auth-service/src/main.ts:43`
- `services/websocket-service/src/main.ts:25`

**Issue:** CORS origin defaults to `"*"` in all services. In production, this allows any website to make authenticated requests.

**Fix:** Enforce explicit origins in non-development environments:
```typescript
const corsOrigin = process.env.CORS_ORIGIN;
if (process.env.NODE_ENV === "production" && corsOrigin === "*") {
  throw new Error("CORS_ORIGIN must be explicitly set in production");
}
```

---

### 1.3 No Rate Limiting on WebSocket Connection Endpoint (HIGH) ✅ FIXED
**File:** `services/websocket-service/src/main.ts`

**Issue:** The HTTP server that fronts Socket.IO has no rate limiting. An attacker can open unlimited WebSocket connections, exhausting memory and file descriptors.

**Fix:** Add connection rate limiting middleware before Socket.IO:
```typescript
import { rateLimit } from "express-rate-limit";

const wsLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 30, // Max 30 connections per IP per minute
  keyGenerator: (req) => req.ip,
});
app.use(wsLimiter);
```

---

### 1.4 Unvalidated Socket.IO Room Subscriptions (MEDIUM) ✅ FIXED
**File:** `services/websocket-service/src/presentation/socket-handlers/ConnectionHandler.ts:14-21`

**Issue:** The `subscribe` handler blindly joins any channel string passed by the client. While `isValidChannel` checks a whitelist, there is no rate limiting on subscription frequency and no maximum channel count per socket.

**Fix:** Enforce max subscriptions per socket and debounce rapid subscribe/unsubscribe calls.

---

### 1.5 Missing Input Sanitization on API Gateway Proxied Routes (MEDIUM) ✅ FIXED
**File:** `apps/api-gateway/src/index.ts:40-49`

**Issue:** The auth proxy forwards raw request bodies to the auth service without any size limits or payload validation. The `express.json({ limit: "10mb" })` is applied globally, including proxied routes.

**Fix:** Move `express.json()` to only apply to non-proxied routes, or add separate limits:
```typescript
app.use("/api/v1/auth", createProxyMiddleware({...})); // No body parser
app.use(express.json({ limit: "10kb" })); // Only for direct routes
```

---

### 1.6 No HTTPS Enforcement (MEDIUM) ✅ FIXED
**Files:** All service `main.ts` files

**Issue:** Services run plain HTTP. In production, TLS should be terminated at the edge or enforced via HSTS headers.

**Fix:** Add `helmet.hsts()` and ensure `trust proxy` is configured if behind a load balancer:
```typescript
app.set("trust proxy", 1);
app.use(helmet.hsts({ maxAge: 31536000, preload: true }));
```

---

### 1.7 Missing Authorization on Alert History Endpoint (MEDIUM) ✅ FIXED
**File:** `apps/api-gateway/src/controllers/alerts.ts`

**Issue:** The `getUserAlerts` controller fetches alerts by `userId` from the JWT, but it does not verify if the requesting user actually owns those alerts (it does by virtue of the query, but there is no global admin check or RBAC).

**Fix:** Establish a formal RBAC layer. Currently acceptable for simple use case but will not scale.

---

## 2. Logic Errors & Broken Functionality

### 2.1 Alert Persistence Never Happens (CRITICAL BUG) ✅ FIXED
**File:** `services/analytics-service/src/application/use-cases/EvaluateAlert.ts`

**Issue:** Alerts are evaluated and published to Kafka, but they are **never persisted to the database**. The Prisma schema has an `Alert` model, but no service writes to it. The API Gateway's `getUserAlerts` returns an empty array for all users.

**Fix:** Add an `IAlertRepository` implementation that writes to Postgres, and persist alerts in the `EvaluateAlert` use case:
```typescript
// In EvaluateAlert.execute()
if (alert) {
  await Promise.all([
    this.publisher.publishAlert(alert),
    this.alertRepo.saveAlert(alert, userId), // Add this
  ]);
}
```

---

### 2.2 Candle Publishing on Every Tick (CRITICAL PERF BUG) ✅ FIXED
**File:** `services/analytics-service/src/application/use-cases/UpdateCandleAggregation.ts:58-70`

**Issue:** The `publishCandle` call happens on **every single tick** (potentially thousands per second per symbol). This floods the `candles` Kafka topic and the WebSocket broadcast layer with redundant data.

**Fix:** Publish candles only when the candle window completes, or throttle publications to a sensible interval (e.g., every 1 second):
```typescript
// Throttle candle publishing
const now = Date.now();
if (now - this.lastPublishTime > 1000) {
  await this.candlePublisher.publishCandle({...});
  this.lastPublishTime = now;
}
```

---

### 2.3 Market History is Completely Mocked (FUNCTIONAL BUG) ✅ FIXED
**File:** `apps/api-gateway/src/controllers/market.ts:7-39`

**Issue:** The `/api/v1/market/history/:symbol` endpoint generates entirely fake candle data using `Math.random()`. It does not query the database for actual historical trades.

**Fix:** Implement a real query against the `Trade` table or TimescaleDB:
```typescript
const trades = await prisma.trade.findMany({
  where: { symbol, timestamp: { gte: startTime, lte: endTime } },
  orderBy: { timestamp: "asc" },
});
// Aggregate into OHLCV candles
```

---

### 2.4 Alert Threshold Evaluates Every Single Tick (LOGIC ERROR) ✅ FIXED
**File:** `services/analytics-service/src/domain/entities/Alert.ts:44-66`

**Issue:** The alert threshold compares **every tick** to the immediately previous tick. In high-volume markets, this causes alert spam because normal bid-ask spread fluctuations trigger 2% thresholds on a tick-by-tick basis.

**Fix:** Implement time-windowed evaluation (e.g., compare against a rolling VWAP or the last price from 60 seconds ago):
```typescript
// Compare against a time-decayed reference price
const decayFactor = 0.99;
const smoothedPrice = previousPrice * decayFactor + currentPrice * (1 - decayFactor);
```

---

### 2.5 No User-to-Alert Association (LOGIC ERROR) ✅ FIXED
**File:** `services/analytics-service/src/domain/entities/Alert.ts`

**Issue:** The `Alert` domain entity has no `userId` field, yet the frontend and API Gateway assume per-user alerts. This is a domain modeling mismatch.

**Fix:** Add `userId` to the `Alert` entity and filter alert evaluation by user-configured thresholds per symbol.

---

### 2.6 FlushCompletedCandles Deletes Without Persisting (DATA LOSS RISK) ✅ FIXED
**File:** `services/analytics-service/src/application/use-cases/FlushCompletedCandles.ts:47-48`

**Issue:** The comment says `TODO: Persist completed candles to TimescaleDB`, but the code **immediately deletes** the candle window from Redis. If the process crashes between delete and persist, the candle data is lost forever.

**Fix:** Persist first, delete only after successful persistence:
```typescript
if (candle && candle.isComplete(now)) {
  await persistToTimescaleDB(candle); // Do this FIRST
  await this.candleRepo.deleteWindow(symbol, prevIntervalStart); // Then delete
}
```

---

### 2.7 Missing `tradeId` in Ticker Entity (INCONSISTENCY) ✅ FIXED
**File:** `services/market-service/src/domain/entities/Ticker.ts`

**Issue:** The `Ticker` entity does not include `tradeId`, so the `recordPrice` sorted set in Redis uses `timestamp` as the score. If two trades happen in the same millisecond, one overwrites the other in the sorted set.

**Fix:** Use a composite score or store trades in a Redis Stream instead of a sorted set.

---

### 2.8 `KafkaTradeConsumer` and `KafkaMarketConsumer` Are Identical (REDUNDANCY) ✅ FIXED
**Files:**
- `services/market-service/src/infrastructure/messaging/KafkaTradeConsumer.ts`
- `services/market-service/src/infrastructure/messaging/KafkaMarketConsumer.ts`
- `services/analytics-service/src/infrastructure/messaging/KafkaTradeConsumer.ts`
- `services/websocket-service/src/infrastructure/messaging/KafkaEventConsumer.ts`

**Issue:** Four nearly identical consumer classes exist across services. They differ only in console.log prefixes.

**Fix:** Extract a single `BaseKafkaConsumer` in `packages/contracts` or a shared messaging package.

---

### 2.9 WebSocket Service Consumes Raw Ticks (WRONG TOPIC) ✅ FIXED
**File:** `services/websocket-service/src/main.ts:56-68`

**Issue:** The WebSocket service consumes from `raw-ticks` (the same topic as market-service and analytics-service). It should consume from `candles` and `alerts` topics instead, as per the architecture doc. Currently it re-broadcasts every raw tick, creating a firehose to the frontend.

**Fix:** Remove the `tickConsumer` and only consume `alerts` and `candles`. The frontend can derive tick-level data if needed, or a separate throttled topic should be created.

---

### 2.10 `BinanceMarketStream` Reconnect Has Infinite Recursion Risk (BUG) ✅ FIXED
**File:** `services/producer-service/src/infrastructure/external/BinanceMarketStream.ts:40-45`

**Issue:** On `close`, it calls `setTimeout(() => this.subscribe(...), 5000)`. If Binance is down for an extended period, this tries to reconnect every 5 seconds indefinitely without backoff jitter or circuit breaker.

**Fix:** Implement exponential backoff with jitter and a max retry count:
```typescript
private reconnectAttempts = 0;
private maxReconnectAttempts = 10;

// In close handler:
if (this.reconnectAttempts < this.maxReconnectAttempts) {
  const delay = Math.min(1000 * 2 ** this.reconnectAttempts, 30000);
  setTimeout(() => this.subscribe(symbols, onMessage), delay + Math.random() * 1000);
  this.reconnectAttempts++;
} else {
  console.error("Max reconnect attempts reached. Exiting.");
  process.exit(1);
}
```

---

## 3. Memory Leaks

### 3.1 Unbounded Alert Store Growth (FRONTEND) ✅ FIXED
**File:** `apps/web/src/features/alerts/store/useAlertStore.ts`

**Issue:** While `MAX_ALERTS = 100` caps the array, each alert object contains a full `AlertEvent` payload. Over long sessions with frequent alerts, the Zustand store and React component trees retain references.

**Fix:** The cap is good, but ensure alert components don't retain obsolete references. Consider a WeakMap or automatic eviction policy.

---

### 3.2 Socket.IO Event Listener Accumulation (FRONTEND) ✅ FIXED
**File:** `apps/web/src/features/market-data/hooks/useMarketStream.ts:72-90`

**Issue:** The cleanup function removes listeners but the socket singleton persists globally. In StrictMode (double mount in development), listeners can accumulate if `connectSocket()` is called before cleanup runs.

**Fix:** Add a ref-tracked connection guard:
```typescript
const isMounted = useRef(true);
useEffect(() => {
  if (!isMounted.current) return;
  // ... connect
  return () => { isMounted.current = false; /* cleanup */ };
}, []);
```

---

### 3.3 Redis Connection Pool Leak in Analytics Service (BACKEND) ✅ FIXED
**File:** `services/analytics-service/src/main.ts:63`

**Issue:** A new `Redis` client is created but on shutdown, only `kafkaProducer.disconnect()` is called. The Redis connection is never explicitly disconnected.

**Fix:**
```typescript
await redis.quit(); // Add to shutdown handler
```

---

### 3.4 ResizeObserver Not Disconnected on TradingChart (FRONTEND) ✅ FIXED
**File:** `apps/web/src/features/market-data/components/TradingChart.ts:84-96`

**Issue:** The `ResizeObserver` is disconnected in cleanup, but the `chart.remove()` call is synchronous and may leave internal lightweight-charts callbacks active if unmounted during an animation frame.

**Fix:** Ensure chart removal happens before observer disconnect:
```typescript
return () => {
  chart.remove();
  observer.disconnect();
  chartRef.current = null;
  seriesRef.current = null;
  candleRef.current = null;
};
```

---

## 4. Performance Bottlenecks

### 4.1 `Promise.all` for Independent Ticks in MarketDataHandler (HIGH) ✅ FIXED
**File:** `services/market-service/src/presentation/event-handlers/MarketDataHandler.ts:56-59`

**Issue:**
```typescript
await Promise.all([
  this.processTick.execute(tick),
  this.persistTrades.execute(tick),
]);
```
While parallel, `processTick` writes to Redis and `persistTrades` accumulates in memory. The bottleneck is that with high tick volume, `processTick` is called for every single message. With thousands of ticks/second, this creates event loop contention.

**Fix:** Add backpressure handling. Use a worker queue or batch process ticks:
```typescript
// Accumulate ticks for 100ms, then process batch
private tickBatch: TickDTO[] = [];
private batchTimer: NodeJS.Timeout | null = null;

async handle({ message }: EachMessagePayload): Promise<void> {
  // ...parse tick...
  this.tickBatch.push(tick);
  if (!this.batchTimer) {
    this.batchTimer = setTimeout(() => this.flushBatch(), 100);
  }
}
```

---

### 4.2 Zod Validation on Every Kafka Message (HIGH) ✅ FIXED
**Files:**
- `services/market-service/src/presentation/event-handlers/MarketDataHandler.ts:44`
- `services/analytics-service/src/presentation/event-handlers/TradeEventHandler.ts:44`
- `services/websocket-service/src/presentation/event-handlers/TickEventHandler.ts:25`

**Issue:** Zod `safeParse` is relatively expensive. With high message throughput, parsing JSON + Zod validation dominates CPU time.

**Fix:** For hot paths, consider:
1. Using a faster validator like `ajv` or `typebox`
2. Skipping validation for internal topics where the producer already validated
3. Using binary serialization (Avro, Protobuf) instead of JSON

---

### 4.3 `hgetall` in API Gateway Ticker Fetch (MEDIUM) ✅ FIXED
**File:** `apps/api-gateway/src/controllers/market.ts:50-63`

**Issue:** `Promise.all(symbols.map(...redis.hgetall...))` creates N Redis round-trips. With many symbols, this is slow.

**Fix:** Use Redis pipelining or `MGET`:
```typescript
const pipeline = redis.pipeline();
symbols.forEach(s => pipeline.hgetall(`ticker:${s}`));
const results = await pipeline.exec();
```

---

### 4.4 `priceHistory` Array Copy on Every Tick (FRONTEND) ✅ FIXED
**File:** `apps/web/src/features/market-data/store/useMarketStore.ts:56-58`

**Issue:**
```typescript
const updatedHistory = [...currentHistory, tick.price].slice(-MAX_PRICE_HISTORY);
```
This creates a new array copy on every tick. With 50 items it's fine, but if `MAX_PRICE_HISTORY` grows or there are many symbols, this is O(N) per tick.

**Fix:** Use a circular buffer or a fixed-size array with index tracking:
```typescript
// Use Immer or Zustand's built-in immer middleware for mutations
import { immer } from "zustand/middleware/immer";

// Then mutate in place
state.priceHistory[tick.symbol].push(tick.price);
if (state.priceHistory[tick.symbol].length > MAX_PRICE_HISTORY) {
  state.priceHistory[tick.symbol].shift();
}
```

---

### 4.5 Inefficient Sparkline Recalculation (FRONTEND) ✅ FIXED
**File:** `apps/web/src/features/market-data/components/TickerCard.tsx:136-148`

**Issue:** `Math.min(...data)` and `Math.max(...data)` iterate the entire array on every render. The SVG path string is also recomputed from scratch.

**Fix:** Memoize the sparkline path:
```typescript
const { points, min, max } = useMemo(() => {
  // compute once per data change
}, [data]);
```

---

### 4.6 Framer Motion Re-renders on Every Tick (FRONTEND) ✅ FIXED
**File:** `apps/web/src/features/market-data/components/TickerCard.tsx:79-92`

**Issue:** `AnimatePresence` with `key={ticker.price}` triggers a mount/unmount animation on **every price change**. This causes constant React reconciliation and DOM manipulation.

**Fix:** Remove `AnimatePresence` for the price text or throttle price updates to 200ms intervals.

---

## 5. Excessive Resource Usage

### 5.1 `createMany` with `skipDuplicates` Creates DB Index Pressure (BACKEND) ✅ FIXED
**File:** `services/market-service/src/infrastructure/database/PrismaTradeRepository.ts:42-55`

**Issue:** `skipDuplicates` relies on PostgreSQL's `ON CONFLICT DO NOTHING`. With high trade volume and a `@unique` index on `tradeId`, the database must check the index for every row in the batch.

**Fix:** Pre-filter duplicates in-memory using a Bloom filter or a local Set of recently seen `tradeId`s before calling `createMany`.

---

### 5.2 Kafka Consumer with `eachMessage` is Slow (BACKEND) ✅ FIXED
**Files:** All `Kafka*Consumer.ts` files

**Issue:** `eachMessage` processes messages one at a time. With high throughput, this is a major bottleneck.

**Fix:** Use `eachBatch` instead and process messages in parallel within a batch:
```typescript
await this.consumer.run({
  eachBatch: async ({ batch, resolveOffset, heartbeat }) => {
    await Promise.all(batch.messages.map(async (message) => {
      await processMessage(message);
      resolveOffset(message.offset);
    }));
    await heartbeat();
  },
});
```

---

### 5.3 Redis TTLs Are Hardcoded and Inconsistent (BACKEND) ✅ FIXED
**Files:**
- `services/market-service/src/main.ts:45` (300s)
- `services/analytics-service/src/infrastructure/cache/RedisCandleRepository.ts:42` (120s)
- `services/analytics-service/src/application/use-cases/UpdateCandleAggregation.ts:57` (ttl = intervalMs/1000 + 120)

**Issue:** No centralized TTL configuration. Different parts of the same candle lifecycle have different expiration times.

**Fix:** Centralize cache policy in a configuration object.

---

## 6. Poor Coding Practices

### 6.1 Type Assertion Abuse (`as any`) ✅ FIXED
**File:** `apps/api-gateway/src/index.ts:61`

**Issue:**
```typescript
app.get("/api/v1/alerts", authMiddleware, getUserAlerts as any);
```

**Fix:** Fix the type signature of `getUserAlerts` to match Express's `RequestHandler` or use a typed wrapper:
```typescript
const wrapper = (fn: (req: AuthenticatedRequest, res: Response) => Promise<void>): RequestHandler => {
  return (req, res, next) => fn(req as AuthenticatedRequest, res).catch(next);
};
```

---

### 6.2 `console.error` Used as Error Reporting (ALL SERVICES) ✅ FIXED
**Files:** Every service uses `console.error` for operational errors.

**Issue:** Console logs are not structured, not aggregated, and easily lost in containerized environments.

**Fix:** Use a structured logger like `pino` or `winston`:
```typescript
import pino from "pino";
const logger = pino({ level: process.env.LOG_LEVEL || "info" });
logger.error({ err, msg: "Processing failed" });
```

---

### 6.3 Magic Numbers Everywhere ✅ FIXED
**Files:** All services

**Examples:**
- `15 * 60 * 1000` (rate limit window)
- `10_000` (flush interval)
- `100` (batch size)
- `50` (alert/query limit)
- `120` (Redis TTL)

**Fix:** Centralize constants in a shared configuration package or `.env` files with validation.

---

### 6.4 Missing Request IDs for Tracing ✅ FIXED
**Files:** All services

**Issue:** There is no correlation ID passed through the request lifecycle (HTTP → Kafka → WebSocket). Debugging distributed traces is impossible.

**Fix:** Generate a `x-request-id` at the API Gateway and propagate it via Kafka message headers:
```typescript
// In KafkaEventPublisher
await this.producer.send({
  topic: this.topic,
  messages: [{
    headers: { "x-request-id": requestId },
    value: JSON.stringify(tick),
  }],
});
```

---

### 6.5 No Health Check for Kafka/Redis Dependencies ✅ FIXED
**Files:** All service `main.ts`

**Issue:** The `/health` endpoint returns `status: "healthy"` even if Kafka or Redis connections are dead.

**Fix:** Implement deep health checks:
```typescript
app.get("/health", async (_req, res) => {
  const kafkaHealthy = await producerPing();
  const redisHealthy = await redis.ping();
  if (!kafkaHealthy || !redisHealthy) {
    return res.status(503).json({ status: "unhealthy" });
  }
  res.json({ status: "healthy" });
});
```

---

## 7. Architecture & Scalability Issues

### 7.1 WebSocket Service Broadcasts Every Raw Tick (ARCHITECTURE) ✅ FIXED
**File:** `services/websocket-service/src/main.ts`

**Issue:** Broadcasting every raw tick to all connected clients does not scale. For 10,000 clients and 1000 ticks/sec, that's 10 million messages/sec.

**Fix:**
1. Remove raw tick broadcasting entirely; only broadcast 1-second aggregated candles
2. Implement selective subscription (clients only get symbols they care about)
3. Use Redis Pub/Sub or NATS for multi-instance WebSocket horizontal scaling

---

### 7.2 Single Kafka Producer Instance Shared for Multiple Topics (RISK) ✅ FIXED
**File:** `services/analytics-service/src/main.ts:66-83`

**Issue:** One `kafkaProducer` is shared between `KafkaAlertPublisher` and `KafkaCandlePublisher`. If one topic is backpressured, both are blocked.

**Fix:** Use separate producer instances per topic for isolation.

---

### 7.3 No Backpressure Handling in Binance Handler (SCALABILITY) ✅ FIXED
**File:** `services/producer-service/src/infrastructure/external/BinanceMarketStream.ts:30-33`

**Issue:** `await onMessage(data.toString())` blocks the WebSocket event loop if Kafka is slow. Messages will pile up in memory.

**Fix:** Use a bounded queue (e.g., `p-queue`) and drop messages if the queue is full:
```typescript
import PQueue from "p-queue";
const queue = new PQueue({ concurrency: 10, autoStart: true });

this.ws.on("message", (data) => {
  if (queue.size < 1000) {
    queue.add(() => onMessage(data.toString()));
  } else {
    metrics.droppedMessages++;
  }
});
```

---

### 7.4 Monolithic Shared Database Package (COUPLING) ✅ FIXED
**File:** `packages/database/src/index.ts`

**Issue:** All services share the same Prisma schema and client. Schema changes for one service affect all others.

**Fix:** Use schema-per-service or at minimum, separate Prisma clients per service with their own subsets of the schema.

---

### 7.5 No Circuit Breaker for External Calls (RESILIENCE) ✅ FIXED
**File:** `services/producer-service/src/infrastructure/external/BinanceMarketStream.ts`

**Issue:** Direct WebSocket connection with no circuit breaker pattern. If Binance blocks the IP, the service enters a tight reconnect loop.

**Fix:** Implement circuit breaker with `opossum`:
```typescript
import CircuitBreaker from "opossum";
const breaker = new CircuitBreaker(this.subscribe.bind(this), {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000,
});
```

---

### 7.6 API Gateway Proxy Does Not Retry (RESILIENCE) ✅ FIXED
**File:** `apps/api-gateway/src/index.ts:40-49`

**Issue:** `http-proxy-middleware` has no retry configuration. If the auth service is briefly unavailable, requests fail immediately.

**Fix:** Configure retry logic in the proxy middleware or use a service mesh.

---

## 8. Database & Storage Issues

### 8.1 `tradeId` Stored as `BigInt` with Precision Loss Risk ✅ FIXED
**File:** `services/market-service/src/infrastructure/database/PrismaTradeRepository.ts:23-35`

**Issue:** `tradeId` is stored as `BigInt` but the domain entity uses `number`. JavaScript's `Number.MAX_SAFE_INTEGER` is 9,007,199,254,740,991. Binance `tradeId`s can exceed this.

**Fix:** Store `tradeId` as a string in the domain model, or use `BigInt` consistently throughout the TypeScript code.

---

### 8.2 Missing TimescaleDB Hypertable Configuration ✅ FIXED
**File:** `packages/database/prisma/schema.prisma`

**Issue:** The schema uses standard Prisma PostgreSQL models. For time-series data (trades, candles), TimescaleDB hypertables should be configured for partitioning.

**Fix:** Add raw SQL migrations for hypertable creation:
```sql
SELECT create_hypertable('trades', by_range('timestamp'));
```

---

### 8.3 No Database Index on `userId` for Alerts ✅ FIXED
**File:** `packages/database/prisma/schema.prisma:41-55`

**Issue:** The `Alert` model has indexes on `symbol+timestamp` and `type`, but no index on `userId`. The `getUserAlerts` query will table-scan.

**Fix:**
```prisma
@@index([userId])
@@index([userId, createdAt])
```

---

### 8.4 `Ticker` Table Never Updated (DEAD SCHEMA) ✅ FIXED
**File:** `packages/database/prisma/schema.prisma:30-39`

**Issue:** There is a `Ticker` table in the schema, but the `ProcessTick` use case only writes to Redis. The Postgres `Ticker` table is unused.

**Fix:** Either remove the `Ticker` model or implement a periodic sync from Redis to Postgres.

---

### 8.5 `PrismaUserRepository` Returns Domain Entity with Raw DB Record ✅ FIXED
**File:** `services/auth-service/src/infrastructure/database/PrismaUserRepository.ts:19-26`

**Issue:** `new User(record)` passes the raw Prisma record directly. If Prisma adds internal fields (e.g., `_count`), they leak into the domain entity.

**Fix:** Map explicitly:
```typescript
return new User({
  id: record.id,
  email: record.email,
  passwordHash: record.passwordHash,
  name: record.name,
  createdAt: record.createdAt,
  updatedAt: record.updatedAt,
});
```

---

## 9. Async Handling & Concurrency

### 9.1 Unhandled Promise Rejection in `PersistTrades.flush()` (CRITICAL) ✅ FIXED
**File:** `services/market-service/src/application/use-cases/PersistTrades.ts:52-66`

**Issue:** If `createMany` fails, the error is re-thrown after re-queueing. But the caller in `main.ts` catches and logs it:
```typescript
} catch (err) {
  console.error("[FlushTrades] Periodic flush failed:", err);
}
```
This means **failed batches retry indefinitely** every 10 seconds, potentially creating a retry storm against a failed database.

**Fix:** Implement exponential backoff for retries and a dead-letter queue for permanently failed batches.

---

### 9.2 Graceful Shutdown Handler Does Not `await` Process Exit (BUG) ✅ FIXED
**Files:** All service `main.ts` files

**Issue:**
```typescript
process.on("SIGINT", () => shutdown("SIGINT"));
process.on("SIGTERM", () => shutdown("SIGTERM"));
```
The shutdown function is async, but the event listener does not await it. Node.js may terminate before shutdown completes.

**Fix:**
```typescript
process.on("SIGINT", async () => {
  await shutdown("SIGINT");
});
```

---

### 9.3 `KafkaMarketConsumer` Does Not Handle Rebalance Events (BUG) ✅ FIXED
**Files:** All Kafka consumers

**Issue:** No `CRASH`, `DISCONNECT`, or `REBALANCING` event handlers. If the consumer group rebalances, the service may continue processing messages with stale assignments.

**Fix:**
```typescript
this.consumer.on("consumer.crash", async (event) => {
  logger.fatal({ event }, "Consumer crashed");
  process.exit(1); // Let orchestrator restart
});
```

---

### 9.4 `Promise.all` in `UpdateCandleAggregation` Has Partial Failure Risk (BUG) ✅ FIXED
**File:** `services/analytics-service/src/application/use-cases/UpdateCandleAggregation.ts:58-70`

**Issue:**
```typescript
await Promise.all([
  this.candleRepo.saveWindow(candle, ttl),
  this.candleRepo.saveLatest(candle),
  this.candlePublisher.publishCandle({...}),
]);
```
If `publishCandle` fails, the candle is still saved to Redis. But if `saveWindow` fails, the publisher may still emit a stale candle.

**Fix:** Save to Redis first, then publish. If publish fails, the data is at least persisted:
```typescript
await this.candleRepo.saveWindow(candle, ttl);
await this.candleRepo.saveLatest(candle);
await this.candlePublisher.publishCandle({...}); // Best-effort
```

---

### 9.5 Socket.IO Client Reconnects Infinitely (FRONTEND)
**File:** `apps/web/src/shared/lib/socket.ts:23`

**Issue:** `reconnectionAttempts: Infinity` means a client with a bad network will DDoS your WebSocket server with reconnection attempts.

**Fix:**
```typescript
reconnectionAttempts: 10,
reconnectionDelay: 1000,
reconnectionDelayMax: 30000,
```

---

## 10. Duplicate & Dead Code

### 10.1 Identical Kafka Consumer Classes (4 copies) ✅ FIXED
**Duplicate of:** Section 2.8

### 10.2 `KafkaTradeConsumer` is Unused in Market Service ✅ FIXED
**File:** `services/market-service/src/infrastructure/messaging/KafkaTradeConsumer.ts`

**Issue:** The market service imports and uses `KafkaMarketConsumer`, but `KafkaTradeConsumer` exists in the same directory and is never imported.

**Fix:** Delete `KafkaTradeConsumer.ts`.

---

### 10.3 `AppError` Defined in `RegisterUser.ts` but Imported in `LoginUser.ts` ✅ FIXED
**File:** `services/auth-service/src/application/use-cases/LoginUser.ts:15`

**Issue:** `AppError` is a generic application error but is defined inside `RegisterUser.ts`. This creates an implicit coupling.

**Fix:** Extract `AppError` to `application/errors/AppError.ts`.

---

### 10.4 `packages/ui` Components Are Unused (DEAD PACKAGE) ✅ FIXED
**Files:** `packages/ui/src/button.tsx`, `packages/ui/src/card.tsx`, `packages/ui/src/code.tsx`

**Issue:** The web app uses its own components in `apps/web/src/shared/ui/`. The `packages/ui` package is dead code.

**Fix:** Either use `packages/ui` in the web app or delete the package to reduce build time.

---

### 10.5 `docs` App is a Turborepo Stub (DEAD APP) ✅ FIXED
**File:** `apps/docs/`

**Issue:** The `docs` app is the default Next.js stub from `create-turbo`. It is not related to the crypto analytics platform.

**Fix:** Remove `apps/docs/` from the workspace.

---

## 11. Dependency & Build Issues

### 11.1 Zod Version Mismatch Across Services ✅ FIXED
**Files:** Multiple `package.json`

| Service | Zod Version |
|---------|-------------|
| auth-service | ^3.25.7 |
| producer-service | ^3.25.3 |
| analytics-service | ^3.25.7 |
| market-service | ^4.4.3 |
| websocket-service | ^4.4.3 |

**Issue:** Zod v3 and v4 have breaking changes. This can cause type incompatibilities in shared DTOs.

**Fix:** Pin Zod to a single version across the monorepo using `catalog:` (pnpm workspaces) or a shared dependency resolution.

---

### 11.2 `@types/ioredis` is Deprecated (Unused) ✅ FIXED
**Files:** `services/market-service/package.json`, `services/analytics-service/package.json`

**Issue:** `ioredis` v5 includes its own TypeScript types. `@types/ioredis` is deprecated and may conflict.

**Fix:** Remove `@types/ioredis` from devDependencies.

---

### 11.3 Missing `prisma` CLI in Market Service ✅ FIXED
**File:** `services/market-service/package.json`

**Issue:** The market-service uses `@crypto-analytics/database` which depends on Prisma, but it doesn't have `prisma` in its own devDependencies. While it inherits at runtime, the `prisma generate` migration scripts may fail if run from the service directory.

**Fix:** Ensure all Prisma operations run from `packages/database` only.

---

### 11.4 `@crypto-analytics/contracts` Has No Runtime Validation ✅ FIXED
**File:** `packages/contracts/src/market.ts`

**Issue:** The contracts package only exports TypeScript interfaces. At runtime, data coming from Kafka/Socket.IO may not match these types.

**Fix:** Add Zod schemas to the contracts package and use them in all services.

---

## 12. Frontend-Specific Issues

### 12.1 `api.ts` Fetch Wrapper Missing AbortController (BUG) ✅ FIXED
**File:** `apps/web/src/shared/lib/api.ts`

**Issue:** No request cancellation. If a component unmounts during a fetch, the promise continues and may cause state updates on unmounted components.

**Fix:**
```typescript
async function request<T>(endpoint: string, options: RequestOptions = {}): Promise<T> {
  const controller = new AbortController();
  const response = await fetch(`${API_BASE}${endpoint}`, {
    signal: controller.signal,
    ...options,
  });
  return response.json();
}
```

---

### 12.2 `useAlertStream` Subscribes Before Connection is Ready (BUG) ✅ FIXED
**File:** `apps/web/src/features/alerts/hooks/useAlertStream.ts:24`

**Issue:** `socket.emit("subscribe", ["alerts"])` is called immediately in `useEffect`, but the socket may not be connected yet.

**Fix:** Wait for `connect` event before subscribing, or use the same pattern as `useMarketStream`.

---

### 12.3 Missing Error Boundary (UX) ✅ FIXED
**File:** `apps/web/src/app/App.tsx`

**Issue:** No React Error Boundary. If any component throws, the entire app crashes to a white screen.

**Fix:** Wrap routes in an error boundary:
```typescript
import { ErrorBoundary } from "react-error-boundary";
<ErrorBoundary fallback={<ErrorPage />}>
  <DashboardPage />
</ErrorBoundary>
```

---

### 12.4 `TradingChart` Creates New Candle Every Second (VISUAL BUG) ✅ FIXED
**File:** `apps/web/src/features/market-data/components/TradingChart.tsx:104-124`

**Issue:** Candle time is `Math.floor(ticker.timestamp / 1000)`. This creates a new candle every second, but the chart claims "1s candles • live". With sub-second tick data, multiple ticks may fall in the same second and overwrite each other.

**Fix:** Use a more appropriate aggregation (e.g., 100ms micro-candles or derive from actual 1m candle data from the backend).

---

### 12.5 `DashboardPage` is Not Memoized (PERF) ✅ FIXED
**File:** `apps/web/src/pages/DashboardPage.tsx`

**Issue:** The entire dashboard re-renders on every Zustand store update. `motion.div` animations restart, `useMemo` for `TRACKED_SYMBOLS` is pointless (it's a constant).

**Fix:** Split into smaller components and use `shallow` selector equality in Zustand subscriptions.

---

### 12.6 Auth Store Persists Nothing (UX BUG) ✅ FIXED
**File:** `apps/web/src/features/auth/store/useAuthStore.ts`

**Issue:** The auth store is in-memory only. Refreshing the page logs the user out.

**Fix:** Persist to `localStorage` with encryption or use httpOnly cookies:
```typescript
import { persist } from "zustand/middleware";
export const useAuthStore = create(persist<AuthStore>(...));
```

---

## 13. Summary & Priority Action Items

### P0 — Fix Immediately (Production Blockers)
1. ✅ **Hardcoded JWT secret fallback** — Remove fallback, enforce env var
2. ✅ **Alerts never persisted to DB** — Add alert repository and persist logic
3. ✅ **Candle publish on every tick** — Throttle or batch candle publications
4. ✅ **Market history is mocked** — Implement real historical data queries
5. ✅ **FlushCompletedCandles deletes before persisting** — Reorder to persist-first

### P1 — Fix Before Scale
6. ✅ **Add rate limiting to WebSocket endpoint**
7. ✅ **Implement Kafka `eachBatch` instead of `eachMessage`**
8. ✅ **Add backpressure queue to Binance handler**
9. ✅ **Fix Zod version mismatch across monorepo**
10. ✅ **Add structured logging (pino/winston) across all services**

### P2 — Improve Maintainability
11. ✅ **Extract shared Kafka consumer base class**
12. ✅ **Centralize configuration and magic numbers**
13. ✅ **Add distributed tracing (request IDs)**
14. ✅ **Implement deep health checks**
15. ✅ **Remove dead code (`packages/ui`, `apps/docs`, `KafkaTradeConsumer`)**

### P3 — Frontend Polish
16. ✅ **Persist auth store**
17. ✅ **Add React Error Boundary**
18. ✅ **Memoize sparkline and ticker card computations**
19. ✅ **Fix `useAlertStream` subscription timing**
20. ✅ **Implement request cancellation in `api.ts`**

---

*Review completed on 2026-05-09. The codebase demonstrates good Clean Architecture principles and solid separation of concerns, but has several critical gaps in production-readiness, observability, and data durability that must be addressed before scaling to real users.*
