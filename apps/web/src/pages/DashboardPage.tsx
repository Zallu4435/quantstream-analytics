import { motion } from "framer-motion";
import { useMarketStream, TickerCard, TradingChart, useMarketStore } from "@/features/market-data";
import { useAlertStream, AlertFeed } from "@/features/alerts";
import { cn } from "@/shared/lib/utils";
import { Activity, ChevronRight, Globe, Bell } from "lucide-react";

const TRACKED_SYMBOLS = ["BTCUSDT", "ETHUSDT", "SOLUSDT"];

export function DashboardPage() {
  useMarketStream(TRACKED_SYMBOLS);
  useAlertStream();

  const connectionStatus = useMarketStore((s) => s.connectionStatus);

  return (
    <div className="min-h-screen bg-[#020203] flex flex-col selection:bg-white/10">
      {/* ── Technical Command Bar (Navbar) ────────────────────────── */}
      <header className="h-14 border-b border-white/5 bg-black/60 backdrop-blur-2xl flex items-center px-8 justify-between shrink-0 z-50 relative overflow-hidden">
        {/* Subtle top glow */}
        <div className="absolute top-0 left-0 w-full h-[1px] bg-gradient-to-r from-transparent via-blue-500/50 to-transparent opacity-50" />
        
        <div className="flex items-center gap-12">
          <motion.div 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-3 group cursor-pointer"
          >
            <div className="h-8 w-8 border border-white/20 flex items-center justify-center rounded-lg bg-gradient-to-br from-white/10 to-transparent group-hover:border-white/40 transition-colors">
              <Activity className="h-4 w-4 text-white animate-pulse" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs font-black uppercase tracking-[0.4em] text-white leading-none">
                CRYPTO<span className="text-blue-400">.OPS</span>
              </span>
              <span className="text-[8px] font-mono text-zinc-400 tracking-widest mt-1">v4.0.2-STABLE</span>
            </div>
          </motion.div>

          <nav className="hidden lg:flex items-center gap-8 border-l border-white/10 pl-12">
            <div className="relative group">
              <span className="text-[10px] font-bold uppercase tracking-[0.2em] text-white cursor-default">
                Terminal
              </span>
              <motion.div 
                layoutId="nav-glow"
                className="absolute -bottom-[22px] left-0 w-full h-[2px] bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.8)]"
              />
            </div>
            <div className="flex items-center gap-2 px-2 py-0.5 rounded bg-white/[0.03] border border-white/5">
              <span className="text-[8px] font-bold text-zinc-400 uppercase tracking-widest">More Modules Coming Soon</span>
            </div>
          </nav>
        </div>

        <div className="flex items-center gap-6">
          {/* Node Status */}
          <div className="flex items-center gap-4 bg-white/[0.03] border border-white/5 rounded-full px-4 py-1.5 backdrop-blur-md">
             <div className="flex flex-col items-end">
               <span className="text-[8px] font-mono text-zinc-400 uppercase leading-none">Network</span>
               <span className="text-[9px] font-bold text-zinc-200 uppercase tracking-tighter">Mainnet v2</span>
             </div>
             <div className={cn(
               "h-2 w-2 rounded-full",
               connectionStatus === "connected" ? "bg-green-500 shadow-[0_0_12px_rgba(34,197,94,0.6)] animate-pulse" : "bg-red-500"
             )} />
          </div>
          
          <div className="flex items-center gap-2">
            <div className="h-9 w-9 rounded-xl border border-white/10 flex items-center justify-center hover:bg-white/5 cursor-pointer transition-all group">
              <Bell className="h-4 w-4 text-zinc-400 group-hover:text-white transition-colors" />
            </div>
            <div className="h-9 w-9 rounded-xl border border-white/10 flex items-center justify-center bg-gradient-to-br from-blue-600 to-blue-800 hover:brightness-110 cursor-pointer transition-all shadow-[0_0_15px_rgba(59,130,246,0.3)]">
              <Globe className="h-4 w-4 text-white" />
            </div>
          </div>
        </div>
      </header>

      {/* ── Main content area ───────────────────────────── */}
      <main className="flex-1 overflow-auto p-6 space-y-6 max-w-[1600px] mx-auto w-full">
        {/* Welcome Section */}
        <section className="flex flex-col gap-1">
          <div className="flex items-center gap-2 text-zinc-400">
            <Globe className="h-3 w-3" />
            <span className="text-[10px] uppercase tracking-[0.2em] font-bold">Global Market Protocol v2.4</span>
          </div>
          <h1 className="text-2xl font-light tracking-tight text-white flex items-center gap-3">
            Operational <span className="font-bold">Dashboard</span>
            <div className="h-[1px] flex-1 bg-gradient-to-r from-white/10 to-transparent ml-4" />
          </h1>
        </section>

        {/* Ticker Grid with Layout Animation */}
        <motion.div 
          layout
          className="grid grid-cols-1 md:grid-cols-3 gap-4"
        >
          {TRACKED_SYMBOLS.map((symbol, i) => (
            <motion.div
              key={symbol}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
            >
              <TickerCard symbol={symbol} />
            </motion.div>
          ))}
        </motion.div>

        {/* Analytics Section */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch min-h-[600px]">
          {/* Main Chart Column */}
          <motion.div 
            initial={{ opacity: 0, scale: 0.98 }}
            animate={{ opacity: 1, scale: 1 }}
            className="lg:col-span-3 terminal-border rounded-xl overflow-hidden flex flex-col relative group"
          >
             <div className="scanning-line" />
             <div className="h-10 border-b border-white/5 bg-white/5 backdrop-blur-md flex items-center px-4 justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-1.5 w-1.5 rounded-full bg-blue-500 animate-pulse" />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-zinc-400">Precision Analytics / <span className="text-white">BTCUSDT</span></span>
                </div>
                <div className="flex items-center gap-4">
                  <span className="text-[9px] font-mono text-zinc-500">RESOL: 1M</span>
                  <ChevronRight className="h-3 w-3 text-zinc-600" />
                </div>
             </div>
             <div className="flex-1 bg-gradient-to-b from-black/40 to-[#020203]">
                <TradingChart symbol="BTCUSDT" height={560} />
             </div>
          </motion.div>

          {/* Alerts Column */}
          <div className="lg:col-span-1 h-full">
            <AlertFeed />
          </div>
        </div>
      </main>
    </div>
  );
}
