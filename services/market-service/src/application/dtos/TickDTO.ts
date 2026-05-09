// ────────────────────────────────────────────────────────────
// Application DTO: TickDTO
// ────────────────────────────────────────────────────────────
// Zod schema for validating incoming Kafka messages.
// Validation happens at the EDGE (presentation layer),
// never inside a use case.

import { z } from "zod";

export const TickSchema = z.object({
  symbol: z.string().min(1),
  price: z.number().positive(),
  quantity: z.number().nonnegative(),
  timestamp: z.number().int().positive(),
  tradeId: z.number().int(),
  isBuyerMaker: z.boolean(),
});

export type TickDTO = z.infer<typeof TickSchema>;
