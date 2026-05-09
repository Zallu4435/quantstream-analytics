// ────────────────────────────────────────────────────────────
// Infrastructure: RedisTickerRepository
// ────────────────────────────────────────────────────────────
// Concrete implementation of ITickerRepository using Upstash Redis.
// This file is the ONLY place that knows about Redis for tickers.

import type { Redis } from "ioredis";
import { Ticker } from "../../domain/entities/Ticker.js";
import type { ITickerRepository } from "../../domain/repositories/ITickerRepository.js";

export class RedisTickerRepository implements ITickerRepository {
  constructor(private readonly redis: Redis) {}

  async saveTicker(ticker: Ticker, ttlSeconds: number): Promise<void> {
    const key = `ticker:${ticker.symbol}`;
    await Promise.all([
      this.redis.hset(key, {
        price: ticker.price.toString(),
        quantity: ticker.quantity.toString(),
        timestamp: ticker.timestamp.toString(),
        tradeId: ticker.tradeId.toString(),
      }),
      this.redis.expire(key, ttlSeconds),
    ]);
  }

  async getTicker(symbol: string): Promise<Ticker | null> {
    const data = await this.redis.hgetall(`ticker:${symbol}`);

    if (!data || !data.price || !data.quantity || !data.timestamp) return null;

    return new Ticker({
      symbol,
      price: parseFloat(data.price),
      quantity: parseFloat(data.quantity),
      timestamp: parseInt(data.timestamp, 10),
      tradeId: data.tradeId || "0",
    });
  }

  async recordPrice(symbol: string, price: number, timestamp: number, tradeId: string | number): Promise<void> {
    // 🚀 Unique member: symbol:price:tradeId to avoid overwriting same-price trades
    await this.redis.zadd(`prices:${symbol}`, timestamp, `${price}:${tradeId}`);
  }
}
