// ────────────────────────────────────────────────────────────
// Infrastructure: PrismaTradeRepository
// ────────────────────────────────────────────────────────────
// Concrete implementation of ITradeRepository using the shared
// @crypto-analytics/database Prisma client.
//
// This is the ONLY file that knows about Prisma for trades.

import type { PrismaClient } from "@prisma/client";
import { Trade } from "../../domain/entities/Trade.js";
import type { ITradeRepository } from "../../domain/repositories/ITradeRepository.js";

export class PrismaTradeRepository implements ITradeRepository {
  private readonly recentTradeIds = new Set<string>();
  private readonly maxRecentSize = 10_000;

  constructor(private readonly prisma: PrismaClient) {}

  async create(trade: Trade): Promise<Trade> {
    const record = await this.prisma.trade.create({
      data: {
        symbol: trade.symbol,
        price: trade.price,
        quantity: trade.quantity,
        timestamp: trade.timestamp,
        tradeId: String(trade.tradeId),
        isBuyerMaker: trade.isBuyerMaker,
      },
    });

    return new Trade({
      id: record.id,
      symbol: record.symbol,
      price: record.price,
      quantity: record.quantity,
      timestamp: record.timestamp,
      tradeId: record.tradeId,
      isBuyerMaker: record.isBuyerMaker,
    });
  }

  async createMany(trades: Trade[]): Promise<number> {
    if (trades.length === 0) return 0;

    // Pre-filter duplicates in-memory to reduce DB index pressure
    const unseen = trades.filter((t) => {
      const key = String(t.tradeId);
      if (this.recentTradeIds.has(key)) return false;
      this.recentTradeIds.add(key);
      return true;
    });

    // Evict oldest if set is too large
    while (this.recentTradeIds.size > this.maxRecentSize) {
      const first = this.recentTradeIds.values().next().value;
      if (first !== undefined) this.recentTradeIds.delete(first);
    }

    if (unseen.length === 0) return 0;

    const result = await this.prisma.trade.createMany({
      data: unseen.map((t) => ({
        symbol: t.symbol,
        price: t.price,
        quantity: t.quantity,
        timestamp: t.timestamp,
        tradeId: String(t.tradeId),
        isBuyerMaker: t.isBuyerMaker,
      })),
      skipDuplicates: true,
    });

    return result.count;
  }
}
