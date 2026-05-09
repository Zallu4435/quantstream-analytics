import { motion, AnimatePresence } from "framer-motion";
import { useAlertStore } from "@/features/alerts/store/useAlertStore";
import { Card, CardContent } from "@/shared/ui/card";
import { cn, formatTime } from "@/shared/lib/utils";
import { Bell, Radio, Terminal } from "lucide-react";

export function AlertFeed() {
  const alerts = useAlertStore((s) => s.alerts);
  const unreadCount = useAlertStore((s) => s.unreadCount);
  const markAllRead = useAlertStore((s) => s.markAllRead);

  return (
    <Card className="terminal-border rounded-xl h-full flex flex-col overflow-hidden bg-zinc-900/40 backdrop-blur-xl border-white/5">
      <div className="h-10 border-b border-white/5 flex items-center px-4 justify-between bg-white/5 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="relative">
            <Bell className="h-3.5 w-3.5 text-zinc-400" />
            {unreadCount > 0 && (
              <span className="absolute -top-0.5 -right-0.5 h-1.5 w-1.5 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
            )}
          </div>
          <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white font-display">Event Protocol</span>
        </div>
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.button
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              onClick={markAllRead}
              className="text-[9px] uppercase tracking-tighter text-zinc-400 hover:text-white transition-colors"
            >
              Flush Cache
            </motion.button>
          )}
        </AnimatePresence>
      </div>

      <CardContent className="flex-1 overflow-y-auto p-4 custom-scrollbar">
        <div className="space-y-3">
          {alerts.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <div className="h-12 w-12 rounded-full bg-white/5 flex items-center justify-center mb-4">
                <Radio className="h-6 w-6 text-zinc-700 animate-pulse" />
              </div>
              <p className="text-[10px] uppercase tracking-widest text-zinc-400 font-bold mb-1">Frequency: Silent</p>
              <p className="text-[9px] text-zinc-500 font-mono">Monitoring blockchain vectors...</p>
            </div>
          ) : (
            <AnimatePresence mode="popLayout">
              {alerts.slice(0, 20).map((alert, i) => (
                <motion.div
                  key={alert.id}
                  layout
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ type: "spring", stiffness: 500, damping: 30, delay: i * 0.05 }}
                  className={cn(
                    "group relative p-3 rounded-lg border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] transition-all duration-300",
                    !alert.read && "border-l-2 border-l-blue-500/50"
                  )}
                >
                  <div className="flex items-start justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <Terminal className="h-3 w-3 text-zinc-600" />
                      <span className="text-[11px] font-bold text-white tracking-tight">{alert.symbol}</span>
                    </div>
                    <span className="text-[9px] text-zinc-400 font-mono">
                      {formatTime(alert.timestamp)}
                    </span>
                  </div>

                  <div className="flex items-center justify-between">
                    <span className={cn(
                      "text-[9px] font-black px-1.5 py-0.5 rounded uppercase tracking-tighter",
                      alert.type === "PRICE_SPIKE" 
                        ? "bg-green-500/10 text-green-400" 
                        : "bg-red-500/10 text-red-400"
                    )}>
                      {alert.type === "PRICE_SPIKE" ? "Volatility Spike" : "Market Drop"}
                    </span>
                    <span className={cn(
                      "text-[10px] font-bold font-mono",
                      alert.type === "PRICE_SPIKE" ? "text-green-500" : "text-red-500"
                    )}>
                      {alert.changePercent > 0 ? "+" : ""}{alert.changePercent.toFixed(2)}%
                    </span>
                  </div>
                  
                  {/* Subtle highlight on hover */}
                  <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-gradient-to-r from-white/[0.02] to-transparent pointer-events-none rounded-lg transition-opacity" />
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
