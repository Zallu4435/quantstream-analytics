import { useEffect, useRef } from "react";
import { socket, connectSocket, disconnectSocket } from "@/shared/lib/socket";
import { useMarketStore } from "@/features/market-data/store/useMarketStore";

/**
 * useMarketStream — Socket subscription hook.
 *
 * Handles the socket lifecycle (connect/subscribe/listen/cleanup)
 * and funnels tick events into the Zustand store.
 *
 * Usage:
 *   useMarketStream(["BTCUSDT", "ETHUSDT", "SOLUSDT"]);
 *
 * This hook is the ONLY place that talks to the socket.
 * UI components read data exclusively from useMarketStore.
 */
export function useMarketStream(symbols: string[]): void {
  const updateTicker = useMarketStore((s) => s.updateTicker);
  const setConnectionStatus = useMarketStore((s) => s.setConnectionStatus);
  const subscribedRef = useRef(false);
  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    
    // ── Connection lifecycle ────────────────────────────
    function onConnect() {
      if (!isMounted.current) return;
      setConnectionStatus("connected");

      // Subscribe to both the catch-all and symbol-specific rooms
      const channels = [
        "tickers",
        ...symbols.map((s) => `ticker:${s.toUpperCase()}`),
      ];
      socket.emit("subscribe", channels);
      subscribedRef.current = true;
      console.log(`📡 Subscribed to: ${channels.join(", ")}`);
    }

    function onDisconnect() {
      setConnectionStatus("disconnected");
      subscribedRef.current = false;
    }

    function onConnectError() {
      setConnectionStatus("error");
    }

    // ── Tick handler ───────────────────────────────────
    function onTick(data: {
      symbol: string;
      price: number;
      quantity: number;
      timestamp: number;
      isBuyerMaker: boolean;
    }) {
      updateTicker(data);
    }

    // ── Register listeners ─────────────────────────────
    socket.on("connect", onConnect);
    socket.on("disconnect", onDisconnect);
    socket.on("connect_error", onConnectError);
    socket.on("tick", onTick);

    // Connect the socket
    setConnectionStatus("connecting");
    connectSocket();

    // If already connected (e.g., hot reload), subscribe immediately
    if (socket.connected && !subscribedRef.current) {
      onConnect();
    }

    // ── Cleanup ────────────────────────────────────────
    return () => {
      isMounted.current = false;
      socket.off("connect", onConnect);
      socket.off("disconnect", onDisconnect);
      socket.off("connect_error", onConnectError);
      socket.off("tick", onTick);

      // Unsubscribe from rooms
      if (subscribedRef.current) {
        const channels = [
          "tickers",
          ...symbols.map((s) => `ticker:${s.toUpperCase()}`),
        ];
        socket.emit("unsubscribe", channels);
        subscribedRef.current = false;
      }

      disconnectSocket();
    };
  }, [symbols, updateTicker, setConnectionStatus]);
}
