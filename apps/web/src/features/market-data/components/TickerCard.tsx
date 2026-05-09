import { memo, useMemo } from "react";
import { motion } from "framer-motion";
import { useMarketStore } from "@/features/market-data/store/useMarketStore";
import { Card, CardContent } from "@/shared/ui/card";
import { cn, formatPrice } from "@/shared/lib/utils";
import { ArrowUpRight, ArrowDownRight } from "lucide-react";

interface TickerCardProps {
  symbol: string;
}

const EMPTY_ARRAY: number[] = [];

export const TickerCard = memo(function TickerCard({ symbol }: TickerCardProps) {
  const ticker = useMarketStore((s) => s.tickers[symbol]);
  const history = useMarketStore((s) => s.priceHistory[symbol] ?? EMPTY_ARRAY);

  if (!ticker) {
    return (
      <Card className="terminal-border rounded-xl h-[120px] p-4 flex flex-col justify-between animate-pulse bg-white/[0.02]">
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="h-3 w-12 bg-white/5 rounded" />
            <div className="h-5 w-20 bg-white/10 rounded" />
          </div>
          <div className="h-10 w-24 bg-white/5 rounded" />
        </div>
        <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: "100%" }}
            transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
            className="h-full w-1/3 bg-white/20"
          />
        </div>
      </Card>
    );
  }

  const priceChange = ticker.price - ticker.previousPrice;
  const priceChangePercent =
    ticker.previousPrice !== 0
      ? ((priceChange / ticker.previousPrice) * 100)
      : 0;

  const isUp = ticker.direction === "up";
  const isDown = ticker.direction === "down";

  return (
    <motion.div
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      className="relative group"
    >
      <div className={cn(
        "absolute -inset-0.5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 blur-sm pointer-events-none",
        isUp ? "bg-green-500/20" : isDown ? "bg-red-500/20" : "bg-white/10"
      )} />

      <Card className="terminal-border rounded-xl h-[120px] overflow-hidden relative group bg-zinc-900/40 backdrop-blur-xl border-white/5">
        <CardContent className="p-4 h-full flex flex-col justify-between relative z-10">
          <div className="flex justify-between items-start">
            <div className="flex flex-col gap-0.5">
              <span className="data-label text-zinc-400">Asset Protocol</span>
              <div className="flex items-center gap-2">
                <span className="text-lg font-bold tracking-tight text-white font-display">
                  {symbol.replace("USDT", "")}
                  <span className="text-zinc-500 text-sm font-normal">/USDT</span>
                </span>
                {isUp ? (
                  <ArrowUpRight className="h-3 w-3 text-green-500" />
                ) : isDown ? (
                  <ArrowDownRight className="h-3 w-3 text-red-500" />
                ) : null}
              </div>
            </div>

            <div className="flex flex-col items-end">
              <span className="data-label text-zinc-400">Market Price</span>
              <span
                className={cn(
                  "text-xl font-bold font-mono tracking-tighter tabular-nums transition-colors duration-500",
                  isUp ? "text-green-400 drop-shadow-[0_0_8px_rgba(34,197,94,0.3)]" :
                  isDown ? "text-red-400 drop-shadow-[0_0_8px_rgba(239,68,68,0.3)]" :
                  "text-white"
                )}
              >
                {formatPrice(ticker.price)}
              </span>
            </div>
          </div>

          <div className="flex justify-between items-end">
            <div className="flex items-center gap-3">
              <div className={cn(
                "text-[10px] font-bold font-mono px-2 py-0.5 rounded-sm border",
                priceChange >= 0
                  ? "bg-green-500/10 text-green-500 border-green-500/20"
                  : "bg-red-500/10 text-red-500 border-red-500/20"
              )}>
                {priceChange >= 0 ? "+" : ""}{priceChangePercent.toFixed(2)}%
              </div>
              <span className="text-[9px] text-zinc-400 font-mono uppercase tracking-tighter">
                Vol: {parseFloat(ticker.quantity.toString()).toLocaleString(undefined, { maximumFractionDigits: 1 })}
              </span>
            </div>

            <div className="h-8 w-24">
              <MiniSparkline data={history} />
            </div>
          </div>
        </CardContent>

        {/* Subtle background glow */}
        <div className={cn(
          "absolute top-0 right-0 w-1/2 h-1/2 opacity-10 blur-3xl pointer-events-none transition-colors duration-1000",
          isUp ? "bg-green-500" : isDown ? "bg-red-500" : "bg-white/20"
        )} />
      </Card>
    </motion.div>
  );
});

function MiniSparkline({
  data,
}: {
  data: number[];
}) {
  const { points, strokeColor } = useMemo(() => {
    if (data.length < 2) return { points: "", strokeColor: "rgba(148, 163, 184, 0.5)" };

    const width = 96;
    const height = 32;
    const min = Math.min(...data);
    const max = Math.max(...data);
    const range = max - min || 1;

    const pts = data
      .map((v, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - ((v - min) / range) * height;
        return `${x},${y}`;
      })
      .join(" ");

    const last = data[data.length - 1];
    const first = data[0];
    const color =
      last !== undefined && first !== undefined && last > first
        ? "rgba(34, 197, 94, 0.8)"
        : last !== undefined && first !== undefined && last < first
          ? "rgba(239, 68, 68, 0.8)"
          : "rgba(148, 163, 184, 0.5)";

    return { points: pts, strokeColor: color };
  }, [data]);

  if (data.length < 2) return null;

  return (
    <svg width={96} height={32} className="overflow-visible">
      <defs>
        <linearGradient id={`gradient-${strokeColor}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={strokeColor} stopOpacity="0.2" />
          <stop offset="100%" stopColor={strokeColor} stopOpacity="0" />
        </linearGradient>
      </defs>
      <motion.polyline
        initial={{ pathLength: 0, opacity: 0 }}
        animate={{ pathLength: 1, opacity: 1 }}
        transition={{ duration: 1 }}
        points={points}
        fill="none"
        stroke={strokeColor}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
