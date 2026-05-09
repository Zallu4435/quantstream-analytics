// ────────────────────────────────────────────────────────────
// Application DTO: BinanceTradeDTO
// ────────────────────────────────────────────────────────────
// Zod schema for validating raw messages from Binance WebSockets.
// This is the "Edge" validation.

import { z } from "zod";

export const BinanceTradeSchema = z.object({
  e: z.string(),          // Event type
  E: z.number(),          // Event time
  s: z.string(),          // Symbol
  t: z.number(),          // Trade ID
  p: z.string(),          // Price (Binance sends strings)
  q: z.string(),          // Quantity (Binance sends strings)
  b: z.number().optional(), // Buyer order ID
  a: z.number().optional(), // Seller order ID
  T: z.number(),          // Trade time
  m: z.boolean(),         // Is the buyer the market maker?
  M: z.boolean(),         // Ignore
});

export type BinanceTradeDTO = z.infer<typeof BinanceTradeSchema>;
