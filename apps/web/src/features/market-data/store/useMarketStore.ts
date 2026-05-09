import { create } from "zustand";
import { immer } from "zustand/middleware/immer";
import type { TickerState, ConnectionStatus } from "@/shared/types";

// ── Market Store Interface ─────────────────────────────────
interface MarketStore {
  tickers: Record<string, TickerState>;
  connectionStatus: ConnectionStatus;
  priceHistory: Record<string, number[]>;

  updateTicker: (tick: {
    symbol: string;
    price: number;
    quantity: number;
    timestamp: number;
    isBuyerMaker: boolean;
  }) => void;

  setConnectionStatus: (status: ConnectionStatus) => void;
  reset: () => void;
}

const MAX_PRICE_HISTORY = 50;

export const useMarketStore = create<MarketStore>()(
  immer((set) => ({
    tickers: {},
    connectionStatus: "disconnected",
    priceHistory: {},

    updateTicker: (tick) =>
      set((state) => {
        const existing = state.tickers[tick.symbol];
        const previousPrice = existing?.price ?? tick.price;

        const direction: TickerState["direction"] =
          tick.price > previousPrice
            ? "up"
            : tick.price < previousPrice
              ? "down"
              : "neutral";

        if (!state.priceHistory[tick.symbol]) {
          state.priceHistory[tick.symbol] = [];
        }
        const history = state.priceHistory[tick.symbol]!;
        history.push(tick.price);
        if (history.length > MAX_PRICE_HISTORY) {
          history.shift();
        }

        state.tickers[tick.symbol] = {
          symbol: tick.symbol,
          price: tick.price,
          previousPrice,
          quantity: tick.quantity,
          timestamp: tick.timestamp,
          isBuyerMaker: tick.isBuyerMaker,
          direction,
        };
      }),

    setConnectionStatus: (status) =>
      set((state) => {
        state.connectionStatus = status;
      }),

    reset: () =>
      set((state) => {
        state.tickers = {};
        state.priceHistory = {};
      }),
  }))
);
