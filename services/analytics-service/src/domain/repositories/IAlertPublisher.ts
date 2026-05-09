// Domain Repository Interface: IAlertPublisher
// ───────────────────────────────────────────────────────────
// Defines the contract for publishing alert events.
// The Kafka producer is just one possible implementation.

import type { Alert } from "../entities/Alert.js";

export interface IAlertPublisher {
  /** Publish an alert event to downstream consumers */
  publishAlert(alert: Alert): Promise<void>;
}