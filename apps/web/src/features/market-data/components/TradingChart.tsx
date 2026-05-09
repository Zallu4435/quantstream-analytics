import { useEffect, useRef } from "react";
import {
  createChart,
  CandlestickSeries,
  type IChartApi,
  type ISeriesApi,
  type CandlestickData,
  type Time,
  ColorType,
} from "lightweight-charts";
import { useMarketStore } from "@/features/market-data/store/useMarketStore";
import { Card, CardHeader, CardTitle, CardContent } from "@/shared/ui/card";

interface TradingChartProps {
  symbol: string;
  height?: number;
}

/**
 * TradingChart — Real-time candlestick chart using lightweight-charts.
 *
 * Reads exclusively from the Zustand store.
 * Builds candles from incoming tick data in 1-second micro-candles
 * for a smooth real-time visualization.
 */
export function TradingChart({ symbol, height = 400 }: TradingChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Candlestick"> | null>(null);
  const candleRef = useRef<CandlestickData<Time> | null>(null);

  const ticker = useMarketStore((s) => s.tickers[symbol]);

  // ── Initialize Chart ─────────────────────────────────────
  useEffect(() => {
    if (!containerRef.current) return;

    const chart = createChart(containerRef.current, {
      height,
      layout: {
        background: { type: ColorType.Solid, color: "transparent" },
        textColor: "rgba(255, 255, 255, 0.5)",
        fontSize: 11,
        fontFamily: "'JetBrains Mono', monospace",
      },
      grid: {
        vertLines: { color: "rgba(255, 255, 255, 0.04)" },
        horzLines: { color: "rgba(255, 255, 255, 0.04)" },
      },
      crosshair: {
        vertLine: {
          color: "rgba(139, 92, 246, 0.3)",
          labelBackgroundColor: "rgb(139, 92, 246)",
        },
        horzLine: {
          color: "rgba(139, 92, 246, 0.3)",
          labelBackgroundColor: "rgb(139, 92, 246)",
        },
      },
      rightPriceScale: {
        borderColor: "rgba(255, 255, 255, 0.1)",
        scaleMargins: { top: 0.1, bottom: 0.1 },
      },
      timeScale: {
        borderColor: "rgba(255, 255, 255, 0.1)",
        timeVisible: true,
        secondsVisible: true,
      },
    });

    const series = chart.addSeries(CandlestickSeries, {
      upColor: "rgb(34, 197, 94)",
      downColor: "rgb(239, 68, 68)",
      borderUpColor: "rgb(34, 197, 94)",
      borderDownColor: "rgb(239, 68, 68)",
      wickUpColor: "rgba(34, 197, 94, 0.6)",
      wickDownColor: "rgba(239, 68, 68, 0.6)",
    });

    chartRef.current = chart;
    seriesRef.current = series;

    // Handle resize
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        chart.applyOptions({ width: entry.contentRect.width });
      }
    });
    observer.observe(containerRef.current);

    return () => {
      chart.remove();
      observer.disconnect();
      chartRef.current = null;
      seriesRef.current = null;
      candleRef.current = null;
    };
  }, [height]);

  // ── Update Chart with Ticks ──────────────────────────────
  // Aggregates ticks into 1-second micro-candles for smooth visualization
  useEffect(() => {
    if (!ticker || !seriesRef.current) return;

    const timeSeconds = Math.floor(ticker.timestamp / 1000) as Time;
    const currentCandle = candleRef.current;

    if (!currentCandle || currentCandle.time !== timeSeconds) {
      // New candle
      const newCandle: CandlestickData<Time> = {
        time: timeSeconds,
        open: ticker.price,
        high: ticker.price,
        low: ticker.price,
        close: ticker.price,
      };
      candleRef.current = newCandle;
      seriesRef.current.update(newCandle);
    } else {
      // Update existing candle
      currentCandle.high = Math.max(currentCandle.high, ticker.price);
      currentCandle.low = Math.min(currentCandle.low, ticker.price);
      currentCandle.close = ticker.price;
      seriesRef.current.update({ ...currentCandle });
    }
  }, [ticker]);

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base font-semibold">
            {symbol.replace("USDT", "")} / USDT
          </CardTitle>
          <span className="text-xs text-muted-foreground font-mono">live tick aggregation</span>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div ref={containerRef} className="w-full" />
      </CardContent>
    </Card>
  );
}
