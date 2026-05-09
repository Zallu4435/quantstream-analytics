// ────────────────────────────────────────────────────────────
// Application Use Case: PublishMarketTick
// ────────────────────────────────────────────────────────────
// Single Responsibility: Publish a domain tick to the event bus.

import type { Tick } from "../../domain/entities/Tick.js";
import type { IMarketDataPublisher } from "../../domain/repositories/IMarketDataPublisher.js";

interface PublishMarketTickDeps {
  eventPublisher: IMarketDataPublisher;
}

export class PublishMarketTick {
  private readonly eventPublisher: IMarketDataPublisher;

  constructor(deps: PublishMarketTickDeps) {
    this.eventPublisher = deps.eventPublisher;
  }

  async execute(tick: Tick): Promise<void> {
    await this.eventPublisher.publishTick(tick);
  }
}
