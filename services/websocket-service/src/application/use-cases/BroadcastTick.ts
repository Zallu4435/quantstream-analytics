// ────────────────────────────────────────────────────────────
// Application Use Case: BroadcastTick
// ────────────────────────────────────────────────────────────

import { Tick } from "../../domain/entities/Tick.js";
import type { IBroadcaster } from "../../domain/repositories/IBroadcaster.js";
import type { TickDTO } from "../dtos/TickDTO.js";

interface BroadcastTickDeps {
  broadcaster: IBroadcaster;
}

export class BroadcastTick {
  private readonly broadcaster: IBroadcaster;

  constructor(deps: BroadcastTickDeps) {
    this.broadcaster = deps.broadcaster;
  }

  async execute(dto: TickDTO): Promise<void> {
    const tick = new Tick(dto);
    const payload = tick.toJSON();

    // Broadcast to the symbol-specific room and general room
    this.broadcaster.broadcast(`ticker:${tick.symbol}`, "tick", payload);
    this.broadcaster.broadcast("tickers", "tick", payload);
  }
}
