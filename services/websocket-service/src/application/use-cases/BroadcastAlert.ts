// ────────────────────────────────────────────────────────────
// Application Use Case: BroadcastAlert
// ────────────────────────────────────────────────────────────

import { Alert } from "../../domain/entities/Alert.js";
import type { IBroadcaster } from "../../domain/repositories/IBroadcaster.js";
import type { AlertDTO } from "../dtos/AlertDTO.js";

interface BroadcastAlertDeps {
  broadcaster: IBroadcaster;
}

export class BroadcastAlert {
  private readonly broadcaster: IBroadcaster;

  constructor(deps: BroadcastAlertDeps) {
    this.broadcaster = deps.broadcaster;
  }

  async execute(dto: AlertDTO): Promise<void> {
    const alert = new Alert(dto);
    const payload = alert.toJSON();

    // Broadcast to the alerts room
    this.broadcaster.broadcast("alerts", "alert", payload);
  }
}
