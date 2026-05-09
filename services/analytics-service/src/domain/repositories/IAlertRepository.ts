// ────────────────────────────────────────────────────────────
// Domain Repository Interface: IAlertRepository
// ────────────────────────────────────────────────────────────
// Defines the contract for alert-related persistence.

export interface IAlertRepository {
  /** Get the last-seen price and timestamp for a symbol (for alert detection) */
  getLastPrice(symbol: string): Promise<{ price: number; timestamp: number } | null>;

  /** Save the last-seen price for a symbol */
  saveLastPrice(symbol: string, price: number): Promise<void>;

  /** Persist a triggered alert to the database */
  saveAlert(alert: import("../entities/Alert.js").Alert): Promise<void>;
}
