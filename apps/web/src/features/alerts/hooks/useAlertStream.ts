import { useEffect, useRef } from "react";
import { socket, connectSocket } from "@/shared/lib/socket";
import { useAlertStore } from "@/features/alerts/store/useAlertStore";
import type { AlertEvent } from "@crypto-analytics/contracts";

export function useAlertStream(): void {
  const addAlert = useAlertStore((s) => s.addAlert);
  const subscribedRef = useRef(false);

  useEffect(() => {
    function onAlert(data: AlertEvent) {
      addAlert({
        ...data,
        id: `${data.symbol}-${data.timestamp}-${Math.random().toString(36).slice(2, 6)}`,
        read: false,
        receivedAt: Date.now(),
      });
    }

    function onConnect() {
      socket.emit("subscribe", ["alerts"]);
      subscribedRef.current = true;
    }

    socket.on("connect", onConnect);
    socket.on("alert", onAlert);
    connectSocket();

    if (socket.connected && !subscribedRef.current) {
      onConnect();
    }

    return () => {
      socket.off("connect", onConnect);
      socket.off("alert", onAlert);
      if (subscribedRef.current) {
        socket.emit("unsubscribe", ["alerts"]);
        subscribedRef.current = false;
      }
    };
  }, [addAlert]);
}
