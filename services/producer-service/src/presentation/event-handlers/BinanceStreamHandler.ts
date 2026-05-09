// ────────────────────────────────────────────────────────────
// Presentation: BinanceStreamHandler
// ────────────────────────────────────────────────────────────
// Maps incoming Binance WebSocket messages to Application Use Cases.
//
// Responsibilities:
// 1. Deserialize raw message
// 2. Validate with Zod DTO (validation at the edge)
// 3. Map to Domain Entity (Tick)
// 4. Dispatch to Use Case (PublishMarketTick)

import { BinanceTradeSchema } from "../../application/dtos/BinanceTradeDTO.js";
import { Tick } from "../../domain/entities/Tick.js";
import type { PublishMarketTick } from "../../application/use-cases/PublishMarketTick.js";

interface BinanceStreamHandlerDeps {
  publishMarketTick: PublishMarketTick;
}

export class BinanceStreamHandler {
  private readonly publishMarketTick: PublishMarketTick;

  constructor(deps: BinanceStreamHandlerDeps) {
    this.publishMarketTick = deps.publishMarketTick;
  }

  /**
   * Handle a raw message from the Binance WebSocket.
   */
  async handle(data: string): Promise<void> {
    try {
      // 1. Deserialize
      const envelope = JSON.parse(data);
      
      // Handle both raw stream and multi-stream envelope formats
      const raw = envelope.data || envelope;

      // 2. Fast-path: Skip non-trade events before validation
      if (raw.e !== "trade") return;

      // 3. Validate at the edge
      const result = BinanceTradeSchema.safeParse(raw);
      if (!result.success) {
        console.error("[BinanceStreamHandler] Invalid trade message format:", result.error.format());
        return;
      }

      const dto = result.data;

      // 3. Map to Domain Entity
      const tick = new Tick({
        symbol: dto.s,
        price: parseFloat(dto.p),
        quantity: parseFloat(dto.q),
        timestamp: dto.T,
        tradeId: dto.t,
        isBuyerMaker: dto.m,
      });

      // 4. Dispatch to Application Layer
      await this.publishMarketTick.execute(tick);
    } catch (err) {
      console.error("[BinanceStreamHandler] Unexpected error:", err);
    }
  }
}
