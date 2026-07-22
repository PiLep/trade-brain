"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import {
  isChartCacheFresh,
  readChartCache,
  writeChartCache,
} from "@/lib/clientMarketCache";
import { usePortfolio } from "@/lib/storage";
import type { ChartData } from "@/lib/types";

type MarketDataValue = {
  charts: Record<string, ChartData>;
  errors: Record<string, string>;
  fetching: boolean;
  refreshedAt: Date | null;
  /** Force network refresh (ignores soft TTL). */
  refresh: () => void;
};

const MarketDataContext = createContext<MarketDataValue | null>(null);

const RANGE = "1y";

export function MarketDataProvider({ children }: { children: ReactNode }) {
  const { holdings, loaded } = usePortfolio();
  const [charts, setCharts] = useState<Record<string, ChartData>>({});
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [fetching, setFetching] = useState(false);
  const [refreshedAt, setRefreshedAt] = useState<Date | null>(null);
  const [bump, setBump] = useState(0);
  const forceNext = useRef(false);

  const symbolsKey = useMemo(
    () =>
      Array.from(new Set(holdings.map((h) => h.symbol.toUpperCase())))
        .sort()
        .join(","),
    [holdings],
  );

  const hasTradeRepublic = holdings.some((h) => h.source === "trade-republic");

  const requestKey = useMemo(() => {
    if (!symbolsKey) return "";
    const fx = hasTradeRepublic ? ",EURUSD=X,EURGBP=X,EURJPY=X" : "";
    return symbolsKey + fx;
  }, [symbolsKey, hasTradeRepublic]);

  const refresh = useCallback(() => {
    forceNext.current = true;
    setBump((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!loaded || !requestKey) {
      setCharts({});
      setErrors({});
      setRefreshedAt(null);
      setFetching(false);
      return;
    }

    let cancelled = false;
    const force = forceNext.current;
    forceNext.current = false;
    const cached = readChartCache(requestKey, RANGE);

    if (cached) {
      setCharts(cached.data);
      setErrors(cached.errors);
      setRefreshedAt(new Date(cached.at));
    }

    // Soft TTL: reuse cache on navigation / reload — no network.
    if (cached && isChartCacheFresh(cached.at) && !force) {
      setFetching(false);
      return;
    }

    const silent = Boolean(cached) && !force;
    if (!silent) setFetching(true);

    (async () => {
      try {
        const res = await fetch(
          `/api/chart?symbols=${encodeURIComponent(requestKey)}&range=${RANGE}`,
        );
        const json = await res.json();
        if (cancelled) return;
        const data = (json.data ?? {}) as Record<string, ChartData>;
        const errs = (json.errors ?? {}) as Record<string, string>;
        const at =
          typeof json.cachedAt === "number" ? json.cachedAt : Date.now();
        setCharts(data);
        setErrors(errs);
        setRefreshedAt(new Date(at));
        writeChartCache({
          at,
          range: RANGE,
          symbolsKey: requestKey,
          data,
          errors: errs,
        });
      } catch (err) {
        if (!cancelled && !cached) {
          setErrors({
            _: err instanceof Error ? err.message : "Failed to load market data",
          });
        }
      } finally {
        if (!cancelled) setFetching(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [loaded, requestKey, bump]);

  const value = useMemo(
    () => ({ charts, errors, fetching, refreshedAt, refresh }),
    [charts, errors, fetching, refreshedAt, refresh],
  );

  return (
    <MarketDataContext.Provider value={value}>
      {children}
    </MarketDataContext.Provider>
  );
}

export function useMarketData(): MarketDataValue {
  const ctx = useContext(MarketDataContext);
  if (!ctx) {
    throw new Error("useMarketData must be used within MarketDataProvider");
  }
  return ctx;
}
