// ────────────────────────────────────────────────────────────
// @crypto-analytics/database — Prisma Client Singleton
// ────────────────────────────────────────────────────────────
//
// This module exports a singleton PrismaClient that is safe to
// import from multiple services (market-service, analytics-service)
// without exhausting the connection pool.
//
// Usage:
//   import { prisma } from "@crypto-analytics/database";
//   const trades = await prisma.trade.findMany();
//
// Graceful shutdown:
//   import { disconnect } from "@crypto-analytics/database";
//   process.on("SIGTERM", () => disconnect());
// ────────────────────────────────────────────────────────────

import { PrismaClient } from "@prisma/client";

// Connection pool limits for Neon Postgres (serverless)
// Neon recommends keeping pool sizes small since it manages
// connections via its proxy. Adjust these based on your plan.
const POOL_SIZE = parseInt(process.env.DATABASE_POOL_SIZE || "5", 10);
const POOL_TIMEOUT = parseInt(process.env.DATABASE_POOL_TIMEOUT || "10", 10);

/**
 * Build the connection URL with pool parameters.
 * Appends pgbouncer-compatible params if not already present.
 */
function buildConnectionUrl(): string | undefined {
  const url = process.env.DATABASE_URL;
  if (!url) return undefined;

  const separator = url.includes("?") ? "&" : "?";
  // connection_limit controls the Prisma pool size
  // pool_timeout controls how long a query waits for a connection
  if (!url.includes("connection_limit")) {
    return `${url}${separator}connection_limit=${POOL_SIZE}&pool_timeout=${POOL_TIMEOUT}`;
  }
  return url;
}

const globalForPrisma = globalThis as unknown as {
  __prisma: PrismaClient | undefined;
};

function createPrismaClient(): PrismaClient {
  const datasourceUrl = buildConnectionUrl();

  return new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["query", "error", "warn"]
        : ["error"],
    ...(datasourceUrl && {
      datasourceUrl,
    }),
  });
}

/**
 * Singleton Prisma client instance.
 * In development, the instance is cached on globalThis to survive
 * hot-reloads without opening new connections each time.
 * In production, a single instance is created per process.
 */
export const prisma: PrismaClient =
  globalForPrisma.__prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.__prisma = prisma;
}

/**
 * Gracefully disconnect the Prisma client.
 * Call this in your service's shutdown handler to drain
 * the connection pool cleanly.
 */
export async function disconnect(): Promise<void> {
  await prisma.$disconnect();
}

// Re-export PrismaClient class for typing and advanced usage
export { PrismaClient };
export default prisma;
