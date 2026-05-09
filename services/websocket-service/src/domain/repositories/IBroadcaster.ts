// ────────────────────────────────────────────────────────────
// Domain Repository Interface: IBroadcaster
// ────────────────────────────────────────────────────────────
// Defines the contract for broadcasting real-time updates to clients.
// Infrastructure layer (Socket.IO) provides the implementation.

export interface IBroadcaster {
  /** Broadcast a message to a specific room */
  broadcast(room: string, event: string, payload: any): void;
  
  /** Get current number of connected clients */
  getConnectedClientsCount(): number;
}
