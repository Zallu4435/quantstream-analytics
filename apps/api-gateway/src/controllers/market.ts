import type { Request, Response } from "express";
import { redis } from "../redis.js";
import { prisma } from "@crypto-analytics/database";

/**
 * GET /api/v1/market/history/:symbol
 */
export const getMarketHistory = async (req: Request, res: Response): Promise<void> => {
  const symbol = (req.params.symbol || req.query.symbol) as string || "BTCUSDT";
  const { limit = "100" } = req.query;

  try {
    const limitNum = Math.min(parseInt(limit as string, 10), 1000);
    
    // Fetch real candles from database
    const dbCandles = await prisma.candle.findMany({
      where: { symbol: symbol.toUpperCase(), interval: "1m" },
      orderBy: { timestamp: "desc" },
      take: limitNum,
    });

    // Transform to format expected by frontend (lightweight-charts)
    const data = dbCandles.reverse().map(c => ({
      time: c.timestamp.getTime() / 1000,
      open: c.open,
      high: c.high,
      low: c.low,
      close: c.close,
      volume: c.volume,
    }));

    res.json({ symbol, data });
  } catch (error) {
    console.error(`❌ Market History Error (${symbol}):`, error);
    res.status(500).json({ error: "Failed to fetch market history" });
  }
};

/**
 * GET /api/v1/market/tickers
 */
export const getTickers = async (_req: Request, res: Response): Promise<void> => {
  try {
    // Fetch tracked symbols (could be moved to config or DB)
    const symbols = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];
    
    // 🚀 Performance: Use Redis pipeline to reduce round-trips
    const pipeline = redis.pipeline();
    symbols.forEach(s => pipeline.hgetall(`ticker:${s}`));
    const results = await pipeline.exec();

    const tickers: Record<string, any> = {};

    results?.forEach((result, index) => {
      const [err, data] = result as [Error | null, any];
      if (err) {
        console.error(`❌ Redis Error for ${symbols[index]}:`, err);
        return;
      }

      if (data && data.price) {
        const symbol = symbols[index]!;
        tickers[symbol] = {
          symbol,
          price: parseFloat(data.price),
          quantity: parseFloat(data.quantity || "0"),
          timestamp: parseInt(data.timestamp || "0", 10),
          direction: "neutral"
        };
      }
    });

    res.json(tickers);
  } catch (error) {
    console.error("❌ Ticker Fetch Error:", error);
    res.status(500).json({ error: "Failed to fetch tickers" });
  }
};
