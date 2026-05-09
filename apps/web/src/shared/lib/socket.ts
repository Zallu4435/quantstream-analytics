import { io, type Socket } from "socket.io-client";

/**
 * Singleton Socket.IO client for the WebSocket service.
 *
 * Usage:
 *   import { socket } from "@/shared/lib/socket";
 *   socket.emit("subscribe", ["tickers", "alerts"]);
 *   socket.on("tick", (data) => { ... });
 *
 * The client auto-connects on import and reconnects on disconnect.
 * It targets the websocket-service at WS_PORT (default 4100).
 */

const WS_URL = import.meta.env.VITE_WS_URL || "http://localhost:4100";

export const socket: Socket = io(WS_URL, {
  // Prefer WebSocket transport for lowest latency
  transports: ["websocket", "polling"],

  // Auto-reconnect with exponential backoff
  reconnection: true,
  reconnectionAttempts: 10,
  reconnectionDelay: 1000,
  reconnectionDelayMax: 10000,

  // Don't connect immediately — let hooks control lifecycle
  autoConnect: false,

  // Timeout settings
  timeout: 20000,
});

// ── Connection lifecycle logging ───────────────────────────
socket.on("connect", () => {
  console.log(`🔌 Socket connected: ${socket.id}`);
});

socket.on("disconnect", (reason) => {
  console.warn(`🔌 Socket disconnected: ${reason}`);
});

socket.on("connect_error", (err) => {
  console.error(`🔌 Socket connection error: ${err.message}`);
});

/**
 * Connect the socket if not already connected.
 * Safe to call multiple times.
 */
export function connectSocket(): void {
  if (!socket.connected) {
    socket.connect();
  }
}

/**
 * Disconnect the socket gracefully.
 */
export function disconnectSocket(): void {
  if (socket.connected) {
    socket.disconnect();
  }
}
