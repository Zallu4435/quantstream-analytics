import Redis from "ioredis";
import "dotenv/config";

const REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";

/**
 * Shared Redis client for the API Gateway.
 * Used for fetching live ticker snapshots.
 */
export const redis = new Redis(REDIS_URL, {
  maxRetriesPerRequest: 3,
  retryStrategy: (times) => {
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
});

redis.on("connect", () => console.log("📡 API Gateway connected to Redis"));
redis.on("error", (err) => console.error("❌ Redis Error:", err));
