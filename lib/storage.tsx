"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { ImportMeta } from "./month";
import type { DcaPlan, Holding } from "./types";
import { useTenant } from "./tenant";

const STORAGE_PREFIX = "trade-brain.portfolio.v1";
const DCA_PREFIX = "trade-brain.dca.v1";
const IMPORT_META_PREFIX = "trade-brain.import-meta.v1";
const LEGACY_STORAGE_KEY = "trade-brain.portfolio.v1";
const LEGACY_DCA_KEY = "trade-brain.dca.v1";
const LEGACY_IMPORT_META_KEY = "trade-brain.import-meta.v1";

const SEED: Holding[] = [
  {
    id: "seed-aapl",
    symbol: "AAPL",
    name: "Apple Inc.",
    quantity: 15,
    avgCost: 165,
    addedAt: "2026-01-05",
    source: "seed",
  },
  {
    id: "seed-btc",
    symbol: "BTC-USD",
    name: "Bitcoin",
    quantity: 0.35,
    avgCost: 42000,
    addedAt: "2026-01-05",
    source: "seed",
  },
  {
    id: "seed-nvda",
    symbol: "NVDA",
    name: "NVIDIA Corporation",
    quantity: 20,
    avgCost: 95,
    addedAt: "2026-01-05",
    source: "seed",
  },
  {
    id: "seed-vwce",
    symbol: "VWCE.DE",
    name: "Vanguard FTSE All-World",
    quantity: 40,
    avgCost: 108,
    addedAt: "2026-01-05",
    source: "seed",
  },
];

function makeId(): string {
  return `h_${Math.random().toString(36).slice(2, 10)}`;
}

function storageKey(tenantId: string) {
  return `${STORAGE_PREFIX}:${tenantId}`;
}
function dcaKey(tenantId: string) {
  return `${DCA_PREFIX}:${tenantId}`;
}
function importMetaKey(tenantId: string) {
  return `${IMPORT_META_PREFIX}:${tenantId}`;
}

function readJsonArray<T>(key: string): T[] | null {
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as T[]) : null;
  } catch {
    return null;
  }
}

function loadHoldings(tenantId: string): Holding[] {
  if (typeof window === "undefined") return SEED;
  const scoped = readJsonArray<Holding>(storageKey(tenantId));
  if (scoped) return scoped;

  // One-time migrate of pre-tenant local data into the first active space.
  const legacy = readJsonArray<Holding>(LEGACY_STORAGE_KEY);
  if (legacy) {
    try {
      window.localStorage.setItem(
        storageKey(tenantId),
        JSON.stringify(legacy),
      );
      window.localStorage.removeItem(LEGACY_STORAGE_KEY);
    } catch {
      /* ignore */
    }
    return legacy;
  }
  return SEED;
}

function loadDcas(tenantId: string): DcaPlan[] {
  if (typeof window === "undefined") return [];
  const scoped = readJsonArray<DcaPlan>(dcaKey(tenantId));
  if (scoped) return scoped;
  const legacy = readJsonArray<DcaPlan>(LEGACY_DCA_KEY);
  if (legacy) {
    try {
      window.localStorage.setItem(dcaKey(tenantId), JSON.stringify(legacy));
      window.localStorage.removeItem(LEGACY_DCA_KEY);
    } catch {
      /* ignore */
    }
    return legacy;
  }
  return [];
}

function loadImportMeta(tenantId: string): ImportMeta | null {
  if (typeof window === "undefined") return null;
  try {
    const raw =
      window.localStorage.getItem(importMetaKey(tenantId)) ??
      window.localStorage.getItem(LEGACY_IMPORT_META_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as ImportMeta;
    if (!parsed?.importedAt) return null;
    if (!window.localStorage.getItem(importMetaKey(tenantId))) {
      window.localStorage.setItem(importMetaKey(tenantId), raw);
      window.localStorage.removeItem(LEGACY_IMPORT_META_KEY);
    }
    return parsed;
  } catch {
    return null;
  }
}

type PortfolioApi = {
  holdings: Holding[];
  dcaPlans: DcaPlan[];
  importMeta: ImportMeta | null;
  loaded: boolean;
  addHolding: (h: Omit<Holding, "id" | "addedAt">) => void;
  updateHolding: (id: string, patch: Partial<Omit<Holding, "id">>) => void;
  removeHolding: (id: string) => void;
  resetToSeed: () => void;
  replaceTradeRepublicImport: (
    imported: Array<
      Omit<Holding, "id" | "addedAt" | "source"> & { externalKey: string }
    >,
    dcas: Array<Omit<DcaPlan, "id">>,
    meta?: Pick<ImportMeta, "csvFirstDate" | "csvLastDate">,
  ) => void;
};

const PortfolioContext = createContext<PortfolioApi | null>(null);

export function PortfolioProvider({ children }: { children: ReactNode }) {
  const { tenantId, loaded: tenantLoaded } = useTenant();
  const [holdings, setHoldings] = useState<Holding[]>([]);
  const [dcaPlans, setDcaPlans] = useState<DcaPlan[]>([]);
  const [importMeta, setImportMeta] = useState<ImportMeta | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [activeTenantId, setActiveTenantId] = useState<string | null>(null);

  useEffect(() => {
    if (!tenantLoaded || !tenantId) {
      setLoaded(false);
      return;
    }
    setHoldings(loadHoldings(tenantId));
    setDcaPlans(loadDcas(tenantId));
    setImportMeta(loadImportMeta(tenantId));
    setActiveTenantId(tenantId);
    setLoaded(true);
  }, [tenantId, tenantLoaded]);

  useEffect(() => {
    if (!loaded || !activeTenantId) return;
    try {
      window.localStorage.setItem(
        storageKey(activeTenantId),
        JSON.stringify(holdings),
      );
    } catch {
      /* ignore */
    }
  }, [holdings, loaded, activeTenantId]);

  useEffect(() => {
    if (!loaded || !activeTenantId) return;
    try {
      window.localStorage.setItem(
        dcaKey(activeTenantId),
        JSON.stringify(dcaPlans),
      );
    } catch {
      /* ignore */
    }
  }, [dcaPlans, loaded, activeTenantId]);

  useEffect(() => {
    if (!loaded || !activeTenantId) return;
    try {
      if (importMeta) {
        window.localStorage.setItem(
          importMetaKey(activeTenantId),
          JSON.stringify(importMeta),
        );
      } else {
        window.localStorage.removeItem(importMetaKey(activeTenantId));
      }
    } catch {
      /* ignore */
    }
  }, [importMeta, loaded, activeTenantId]);

  const addHolding = useCallback((h: Omit<Holding, "id" | "addedAt">) => {
    setHoldings((prev) => {
      const existing = prev.find(
        (p) => p.symbol.toUpperCase() === h.symbol.toUpperCase(),
      );
      if (existing) {
        const totalQty = existing.quantity + h.quantity;
        const avgCost =
          totalQty === 0
            ? h.avgCost
            : (existing.quantity * existing.avgCost +
                h.quantity * h.avgCost) /
              totalQty;
        return prev.map((p) =>
          p.id === existing.id
            ? { ...p, quantity: totalQty, avgCost, name: h.name || p.name }
            : p,
        );
      }
      return [
        ...prev,
        {
          ...h,
          symbol: h.symbol.toUpperCase(),
          id: makeId(),
          addedAt: new Date().toISOString().slice(0, 10),
          source: h.source ?? "manual",
        },
      ];
    });
  }, []);

  const updateHolding = useCallback(
    (id: string, patch: Partial<Omit<Holding, "id">>) => {
      setHoldings((prev) =>
        prev.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      );
    },
    [],
  );

  const removeHolding = useCallback((id: string) => {
    setHoldings((prev) => prev.filter((p) => p.id !== id));
  }, []);

  const resetToSeed = useCallback(() => {
    setHoldings(SEED);
    setDcaPlans([]);
    setImportMeta(null);
  }, []);

  const replaceTradeRepublicImport = useCallback(
    (
      imported: Array<
        Omit<Holding, "id" | "addedAt" | "source"> & { externalKey: string }
      >,
      dcas: Array<Omit<DcaPlan, "id">>,
      meta?: Pick<ImportMeta, "csvFirstDate" | "csvLastDate">,
    ) => {
      setHoldings((prev) => {
        const keep = prev.filter((p) => {
          if (p.source === "trade-republic" || p.source === "seed") return false;
          if (String(p.id).startsWith("tr_") || String(p.id).startsWith("seed-"))
            return false;
          return true;
        });
        const today = new Date().toISOString().slice(0, 10);
        const next: Holding[] = imported.map((h) => ({
          ...h,
          symbol: h.symbol.toUpperCase(),
          id: `tr_${h.externalKey}`,
          addedAt: today,
          source: "trade-republic" as const,
          externalKey: h.externalKey,
        }));
        const trSymbols = new Set(next.map((h) => h.symbol));
        const keptManual = keep.filter((p) => !trSymbols.has(p.symbol));
        return [...keptManual, ...next];
      });

      setDcaPlans(
        dcas.map((d) => ({
          ...d,
          id: `dca_${d.externalKey}`,
          symbol: d.symbol.toUpperCase(),
        })),
      );

      const fromDca = dcas.flatMap((d) => [d.firstDate, d.lastDate]).filter(Boolean);
      const dates = [
        meta?.csvFirstDate,
        meta?.csvLastDate,
        ...fromDca,
      ]
        .filter((d): d is string => Boolean(d))
        .sort();
      setImportMeta({
        importedAt: new Date().toISOString(),
        csvFirstDate: meta?.csvFirstDate ?? dates[0] ?? null,
        csvLastDate: meta?.csvLastDate ?? dates[dates.length - 1] ?? null,
      });
    },
    [],
  );

  const value = useMemo(
    () => ({
      holdings,
      dcaPlans,
      importMeta,
      loaded: loaded && tenantLoaded && !!tenantId,
      addHolding,
      updateHolding,
      removeHolding,
      resetToSeed,
      replaceTradeRepublicImport,
    }),
    [
      holdings,
      dcaPlans,
      importMeta,
      loaded,
      tenantLoaded,
      tenantId,
      addHolding,
      updateHolding,
      removeHolding,
      resetToSeed,
      replaceTradeRepublicImport,
    ],
  );

  return (
    <PortfolioContext.Provider value={value}>
      {children}
    </PortfolioContext.Provider>
  );
}

export function usePortfolio(): PortfolioApi {
  const ctx = useContext(PortfolioContext);
  if (!ctx) {
    throw new Error("usePortfolio must be used within PortfolioProvider");
  }
  return ctx;
}
