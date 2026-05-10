// ────────────────────────────────────────────────────────────
// Presentation: TickEventHandler
// ────────────────────────────────────────────────────────────

import type { EachMessagePayload } from "kafkajs";
import { TickSchema } from "../../application/dtos/TickDTO.js";
import type { BroadcastTick } from "../../application/use-cases/BroadcastTick.js";

interface TickEventHandlerDeps {
  broadcastTick: BroadcastTick;
}

export class TickEventHandler {
  private readonly broadcastTick: BroadcastTick;

  constructor(deps: TickEventHandlerDeps) {
    this.broadcastTick = deps.broadcastTick;
  }

  async handle({ message }: EachMessagePayload): Promise<void> {
    if (!message.value) return;

    const raw = JSON.parse(message.value.toString());
    const result = TickSchema.safeParse(raw);

    if (!result.success) {
      console.error("[TickEventHandler] Invalid tick format:", result.error.format());
      return;
    }

    await this.broadcastTick.execute(result.data);
  }
}
