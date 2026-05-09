// ────────────────────────────────────────────────────────────
// Presentation: AlertEventHandler
// ────────────────────────────────────────────────────────────

import type { EachMessagePayload } from "kafkajs";
import { AlertSchema } from "../../application/dtos/AlertDTO.js";
import type { BroadcastAlert } from "../../application/use-cases/BroadcastAlert.js";

interface AlertEventHandlerDeps {
  broadcastAlert: BroadcastAlert;
}

export class AlertEventHandler {
  private readonly broadcastAlert: BroadcastAlert;

  constructor(deps: AlertEventHandlerDeps) {
    this.broadcastAlert = deps.broadcastAlert;
  }

  async handle({ message }: EachMessagePayload): Promise<void> {
    if (!message.value) return;

    const raw = JSON.parse(message.value.toString());
    const result = AlertSchema.safeParse(raw);

    if (!result.success) {
      console.error("[AlertEventHandler] Invalid alert format:", result.error.format());
      return;
    }

    await this.broadcastAlert.execute(result.data);
  }
}
