// ────────────────────────────────────────────────────────────
// Infrastructure: RedisCandleRepository
// ────────────────────────────────────────────────────────────
// Concrete implementation of ICandleRepository using Upstash Redis.
// This file is the ONLY place that knows about Redis for candles.

import type { Redis } from "ioredis";
import type { PrismaClient } from "@crypto-analytics/database";
import { Candle, type CandleProps } from "../../domain/entities/Candle.js";
import type { ICandleRepository } from "../../domain/repositories/ICandleRepository.js";

export class RedisCandleRepository implements ICandleRepository {
  constructor(
    private readonly redis: Redis,
    private readonly prisma: PrismaClient
  ) {}

  private windowKey(symbol: string, intervalStart: number): string {
    return `candle:window:${symbol}:${intervalStart}`;
  }

  async getWindow(symbol: string, intervalStart: number): Promise<Candle | null> {
    const data = await this.redis.get(this.windowKey(symbol, intervalStart));
    if (!data) return null;
    try {
      return new Candle(JSON.parse(data) as CandleProps);
    } catch {
      return null;
    }
  }

  async saveWindow(candle: Candle, ttlSeconds: number): Promise<void> {
    await this.redis.set(
      this.windowKey(candle.symbol, candle.openTime),
      JSON.stringify(candle.toJSON()),
      "EX",
      ttlSeconds
    );
  }

  async saveLatest(candle: Candle): Promise<void> {
    await this.redis.set(
      `candle:${candle.symbol}:${candle.interval}:latest`,
      JSON.stringify(candle.toJSON()),
      "EX",
      120
    );
  }

  async deleteWindow(symbol: string, intervalStart: number): Promise<void> {
    await this.redis.del(this.windowKey(symbol, intervalStart));
  }

  async persistCandle(candle: Candle): Promise<void> {
    await this.prisma.candle.create({
      data: {
        symbol: candle.symbol,
        interval: candle.interval,
        open: candle.open,
        high: candle.high,
        low: candle.low,
        close: candle.close,
        volume: candle.volume,
        timestamp: new Date(candle.openTime),
      },
    });
  }

  async updateAggregation(
    symbol: string, 
    price: number, 
    quantity: number, 
    intervalStart: number, 
    ttlSeconds: number
  ): Promise<CandleProps> {
    const key = this.windowKey(symbol, intervalStart);
    
    const luaScript = `
      local key = KEYS[1]
      local price = tonumber(ARGV[1])
      local quantity = tonumber(ARGV[2])
      local ttl = tonumber(ARGV[3])
      local intervalStart = tonumber(ARGV[4])
      local symbol = ARGV[5]

      local data = redis.call('get', key)
      local candle
      
      if data then
        candle = cjson.decode(data)
        candle.close = price
        if price > candle.high then candle.high = price end
        if price < candle.low then candle.low = price end
        candle.volume = candle.volume + quantity
        candle.tradeCount = (candle.tradeCount or 0) + 1
      else
        candle = {
          symbol = symbol,
          interval = "1m",
          open = price,
          high = price,
          low = price,
          close = price,
          volume = quantity,
          openTime = intervalStart,
          tradeCount = 1
        }
      end

      local result = cjson.encode(candle)
      redis.call('set', key, result, 'ex', ttl)
      
      -- Also update the "latest" key
      local latestKey = "candle:" .. symbol .. ":1m:latest"
      redis.call('set', latestKey, result, 'ex', 120)
      
      return result
    `;

    const result = await this.redis.eval(
      luaScript, 
      1, 
      key, 
      price.toString(), 
      quantity.toString(), 
      ttlSeconds.toString(), 
      intervalStart.toString(), 
      symbol
    ) as string;

    return JSON.parse(result);
  }
}
