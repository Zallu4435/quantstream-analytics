// ────────────────────────────────────────────────────────────
// Presentation: ConnectionHandler
// ────────────────────────────────────────────────────────────

import type { Server, Socket } from "socket.io";

export class ConnectionHandler {
  constructor(private readonly io: Server) {}

  handleConnection(socket: Socket): void {
    console.log(`🔌 Client connected: ${socket.id}`);

    const MAX_SUBSCRIPTIONS = 50;
    let lastSubscriptionTime = 0;

    // Room-based subscriptions
    socket.on("subscribe", (channels: string[]) => {
      const now = Date.now();
      if (now - lastSubscriptionTime < 500) {
        return; // Debounce/Throttling
      }
      lastSubscriptionTime = now;

      if (!Array.isArray(channels)) return;

      for (const channel of channels) {
        // Enforce max subscriptions (socket.rooms includes socket.id)
        if (socket.rooms.size > MAX_SUBSCRIPTIONS) {
          console.warn(`  ⚠ ${socket.id} reached max subscriptions`);
          break;
        }

        if (this.isValidChannel(channel)) {
          socket.join(channel);
          console.log(`  → ${socket.id} joined room: ${channel}`);
        }
      }
    });

    socket.on("unsubscribe", (channels: string[]) => {
      if (!Array.isArray(channels)) return;
      for (const channel of channels) {
        socket.leave(channel);
        console.log(`  → ${socket.id} left room: ${channel}`);
      }
    });

    socket.on("disconnect", (reason) => {
      console.log(`🔌 Client disconnected: ${socket.id} (${reason})`);
    });
  }

  private isValidChannel(channel: string): boolean {
    return (
      ["tickers", "alerts", "candles"].includes(channel) ||
      channel.startsWith("ticker:")
    );
  }
}
