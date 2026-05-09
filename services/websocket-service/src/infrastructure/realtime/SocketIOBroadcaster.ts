// ────────────────────────────────────────────────────────────
// Infrastructure: SocketIOBroadcaster
// ────────────────────────────────────────────────────────────

import type { Server } from "socket.io";
import type { IBroadcaster } from "../../domain/repositories/IBroadcaster.js";

export class SocketIOBroadcaster implements IBroadcaster {
  constructor(private readonly io: Server) {}

  broadcast(room: string, event: string, payload: any): void {
    this.io.to(room).emit(event, payload);
  }

  getConnectedClientsCount(): number {
    return this.io.engine.clientsCount;
  }
}
