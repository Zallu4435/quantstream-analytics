# Crypto Analytics Platform: Architectural Walkthrough

This document provides a detailed breakdown of the Clean Architecture implementation across the microservices in this repository.

## 🏛️ Overall Architecture
The system follows an **Event-Driven Microservices** pattern centered around a **Kafka** message bus and a **Clean Architecture** (Onion) internal structure for each service.

### Dependency Layers (Inward Pointing)
1.  **Domain Layer**: Pure TypeScript. Entities (Business Logic) and Repository Interfaces. No dependencies on frameworks or libraries.
2.  **Application Layer**: Use Cases (Orchestration logic). Depends only on Domain. Uses DTOs for data boundary crossing.
3.  **Infrastructure Layer**: Low-level implementation details (Prisma, Redis, Kafka, Binance API, Bcrypt). Implements the interfaces defined in the Domain.
4.  **Presentation Layer**: Adapters for the outside world. Express Controllers (HTTP), Kafka Event Handlers, Socket.IO emitters.

---

## 🛰️ Service Manifest

### 1. API Gateway (`apps/api-gateway`)
The single entry point for the React frontend.
- **Entry**: `src/index.ts` (Configures Helmet, CORS, Rate Limiting, and Proxies).
- **Auth Proxy**: Routes `/api/v1/auth/*` to the `auth-service`.
- **Controllers**:
    - `market.ts`: Provides historical candle data (mocked).
    - `alerts.ts`: Fetches global alert history from Prisma.
- **Middleware**: `auth.ts` (JWT verification using shared secret).

### 2. Auth Service (`services/auth-service`)
Handles identity and security.
- **Domain**: `User` entity.
- **Infrastructure**: `PrismaUserRepository`, `JwtTokenService`, `BcryptPasswordHasher`.
- **Use Cases**: `RegisterUser`, `LoginUser`.

### 3. Producer Service (`services/producer-service`)
The "Ingress" service for market data.
- **Infrastructure**: `BinanceMarketStream` (WebSocket client with auto-reconnection).
- **Flow**: Connects to Binance → Validates with Zod → Publishes `raw-ticks` to Kafka.
- **Resilience**: Implements exponential backoff on connection drops.

### 4. Market Service (`services/market-service`)
Handles data persistence and snapshots.
- **Infrastructure**: 
    - `PrismaTradeRepository`: Bulk inserts trades with `skipDuplicates`.
    - `RedisTickerRepository`: Stores latest price snapshots for fast UI loading.
    - `KafkaMarketConsumer`: Consumes from `raw-ticks`.
- **Resilience**: **Buffered Persistence**. Ticks are buffered in memory and flushed to Postgres every 100 items OR every 10 seconds (fail-safe).

### 5. Analytics Service (`services/analytics-service`)
The "Brain" of the system.
- **Domain**: 
    - `Candle.ts`: Logic for aggregating OHLCV data.
    - `Alert.ts`: Logic for detecting price spikes/drops (threshold-based).
- **Use Cases**: 
    - `UpdateCandleAggregation`: Real-time OHLV calculation.
    - `EvaluateAlert`: State-aware price monitoring.
    - `FlushCompletedCandles`: Finalizes minute windows.
- **Messaging**: Publishes `alerts` and `candles` back to Kafka for the UI.

### 6. WebSocket Service (`services/websocket-service`)
Real-time delivery to the browser.
- **Flow**: Consumes `alerts` and `candles` from Kafka → Broadcasts via Socket.IO.
- **Presentation**: `ConnectionHandler.ts` manages room subscriptions (e.g., `ticker:BTCUSDT`).

---

## 🧪 Technical Safeguards
- **Type Safety**: Unified TypeScript config across the monorepo. Every service must pass `tsc --noEmit`.
- **Database**: Shared Prisma schema in `packages/database`.
- **Contracts**: Shared TypeScript types/interfaces in `packages/contracts`.
- **Infrastructure**: A single `docker-compose.yml` provides a local, free-tier-safe environment (Postgres, Kafka, Redis).

## 📊 Data Flow Example (Real-time Tick)
1.  **Binance** → `producer-service` (WebSocket)
2.  `producer-service` → **Kafka** (`raw-ticks`)
3.  **Kafka** → `market-service` (Update Redis Snapshot + Batch to Postgres)
4.  **Kafka** → `analytics-service` (Aggregate into 1m Candle + Check for Alert)
5.  `analytics-service` → **Kafka** (`alerts` / `candles`)
6.  **Kafka** → `websocket-service` → **Frontend** (Socket.IO)
