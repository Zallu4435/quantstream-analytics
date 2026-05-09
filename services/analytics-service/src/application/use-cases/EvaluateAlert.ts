// ────────────────────────────────────────────────────────────
// Application Use Case: EvaluateAlert
// ────────────────────────────────────────────────────────────
// Single Responsibility: Check if a tick's price change exceeds
// the alert threshold and publish the alert if so.
//
// Depends only on domain entities and repository INTERFACES.

import { Alert } from "../../domain/entities/Alert.js";
import type { IAlertRepository } from "../../domain/repositories/IAlertRepository.js";
import type { IAlertPublisher } from "../../domain/repositories/IAlertPublisher.js";
import type { RawTickDTO } from "../dtos/RawTickDTO.js";

interface EvaluateAlertDeps {
  alertRepository: IAlertRepository;
  eventPublisher: IAlertPublisher;
  threshold: number;
}

export class EvaluateAlert {
  private readonly alertRepo: IAlertRepository;
  private readonly publisher: IAlertPublisher;
  private readonly threshold: number;

  constructor(deps: EvaluateAlertDeps) {
    this.alertRepo = deps.alertRepository;
    this.publisher = deps.eventPublisher;
    this.threshold = deps.threshold;
  }

  async execute(tick: RawTickDTO): Promise<Alert | null> {
    const DRIFT_REBASE_INTERVAL = 5 * 60 * 1000; // 5 minutes

    // 1. Get the "Reference Price" (baseline for comparison)
    const refData = await this.alertRepo.getLastPrice(tick.symbol);
    
    if (refData === null) {
      await this.alertRepo.saveLastPrice(tick.symbol, tick.price);
      return null;
    }

    // 2. Delegate detection logic to domain entity
    const alert = Alert.evaluate(
      tick.symbol,
      tick.price,
      refData.price,
      this.threshold,
      tick.timestamp
    );

    // 3. Handle re-basing
    const shouldRebase = alert || (Date.now() - refData.timestamp > DRIFT_REBASE_INTERVAL);
    
    if (shouldRebase) {
      await this.alertRepo.saveLastPrice(tick.symbol, tick.price);
    }

    if (!alert) return null;

    // 4. Persist to DB and publish to Kafka in parallel
    await Promise.all([
      this.publisher.publishAlert(alert),
      this.alertRepo.saveAlert(alert),
    ]);

    console.warn(`🚨 ALERT: ${alert.message}`);
    return alert;
  }
}
