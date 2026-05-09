// ────────────────────────────────────────────────────────────
// Application DTO: AlertDTO
// ────────────────────────────────────────────────────────────

import { z } from "zod";

export const AlertSchema = z.object({
  symbol: z.string(),
  type: z.string(),
  message: z.string(),
  price: z.number(),
  threshold: z.number(),
  timestamp: z.number(),
});

export type AlertDTO = z.infer<typeof AlertSchema>;
