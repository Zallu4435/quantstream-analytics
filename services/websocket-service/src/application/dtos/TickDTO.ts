// ────────────────────────────────────────────────────────────
// Application DTO: TickDTO
// ────────────────────────────────────────────────────────────

import { z } from "zod";

export const TickSchema = z.object({
  symbol: z.string(),
  price: z.number(),
  quantity: z.number(),
  timestamp: z.number(),
  isBuyerMaker: z.boolean(),
});

export type TickDTO = z.infer<typeof TickSchema>;
