// ────────────────────────────────────────────────────────────
// Infrastructure: PersistentAlertRepository
// ────────────────────────────────────────────────────────────
// Concrete implementation of IAlertRepository using:
// 1. Redis (for low-latency last-price tracking)
// 2. Prisma/Postgres (for long-term alert history)

import type { Redis } from "ioredis";
import type { PrismaClient } from "@crypto-analytics/database";
import type { IAlertRepository } from "../../domain/repositories/IAlertRepository.js";
import type { Alert } from "../../domain/entities/Alert.js";

export class PersistentAlertRepository implements IAlertRepository {
  constructor(
    private readonly redis: Redis,
    private readonly prisma: PrismaClient
  ) {}

  async getLastPrice(symbol: string): Promise<{ price: number; timestamp: number } | null> {
    const val = await this.redis.get(`alert:reference:${symbol}`);
    if (!val) return null;
    try {
      return JSON.parse(val);
    } catch {
      return null;
    }
  }

  async saveLastPrice(symbol: string, price: number): Promise<void> {
    await this.redis.set(
      `alert:reference:${symbol}`, 
      JSON.stringify({ price, timestamp: Date.now() })
    );
  }

  async saveAlert(alert: Alert): Promise<void> {
    await this.prisma.alert.create({
      data: {
        userId: alert.userId || null,
        type: alert.type,
        symbol: alert.symbol,
        price: alert.price,
        previousPrice: alert.previousPrice,
        changePercent: alert.changePercent,
        message: alert.message,
        timestamp: new Date(alert.timestamp),
      },
    });
  }
}
