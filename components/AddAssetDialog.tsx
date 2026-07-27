"use client";

import { useEffect, useRef, useState } from "react";
import type { Holding } from "@/lib/types";

interface SearchResult {
  symbol: string;
  name: string;
  exchange: string;
  type: string;
}

export function AddAssetDialog({
  open,
  onClose,
  onAdd,
}: {
  open: boolean;
  onClose: () => void;
  onAdd: (h: Omit<Holding, "id" | "addedAt">) => void;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [selected, setSelected] = useState<SearchResult | null>(null);
  const [quantity, setQuantity] = useState("");
  const [avgCost, setAvgCost] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset when the dialog closes.
  useEffect(() => {
    if (!open) {
      setQuery("");
      setResults([]);
      setSelected(null);
      setQuantity("");
      setAvgCost("");
    }
  }, [open]);

  // Close on Escape.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Debounced search.
  useEffect(() => {
    if (selected) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim().length < 1) {
      setResults([]);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const json = await res.json();
        setResults(json.results ?? []);
      } catch {
        setResults([]);
      } finally {
        setSearching(false);
      }
    }, 250);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, selected]);

  if (!open) return null;

  const canSubmit =
    selected &&
    Number(quantity) > 0 &&
    Number(avgCost) >= 0 &&
    quantity !== "";

  const submit = () => {
    if (!selected || !canSubmit) return;
    onAdd({
      symbol: selected.symbol,
      name: selected.name,
      quantity: Number(quantity),
      avgCost: Number(avgCost),
    });
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 backdrop-blur-sm sm:items-start sm:p-4 sm:pt-[10vh]"
      style={{ background: "var(--tb-overlay)" }}
      onClick={onClose}
    >
      <div
        className="animate-in w-full max-w-md rounded-t-2xl border border-hairline bg-surface p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-2xl sm:p-5 sm:pb-5"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold text-ink">Add a position</h2>
          <button
            type="button"
            onClick={onClose}
            className="touch-target grid place-items-center rounded-pill text-[18px] text-ink-muted hover:bg-surface-2 hover:text-ink"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Symbol search */}
        <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-muted">
          Asset
        </label>
        {selected ? (
          <div className="flex items-center justify-between rounded-lg border border-hairline bg-surface-2 px-3 py-2">
            <div className="min-w-0">
              <div className="truncate font-medium text-ink">{selected.name}</div>
              <div className="text-xs text-ink-muted">{selected.symbol}</div>
            </div>
            <button
              onClick={() => {
                setSelected(null);
                setQuery("");
              }}
              className="text-xs text-s-1 hover:underline"
            >
              Change
            </button>
          </div>
        ) : (
          <div className="relative">
            <input
              autoFocus
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search e.g. Apple, AAPL, Bitcoin, BTC-USD…"
              className="min-h-12 w-full rounded-lg border border-hairline bg-surface-2 px-3 py-3 text-base text-ink outline-none placeholder:text-ink-muted focus:border-s-1 sm:min-h-0 sm:py-2 sm:text-sm"
            />
            {(results.length > 0 || searching) && (
              <ul className="absolute z-10 mt-1 max-h-64 w-full overflow-auto rounded-lg border border-hairline bg-surface-2 py-1 shadow-2xl">
                {searching && results.length === 0 && (
                  <li className="px-3 py-2 text-sm text-ink-muted">
                    Searching…
                  </li>
                )}
                {results.map((r) => (
                  <li key={`${r.symbol}-${r.exchange}`}>
                    <button
                      type="button"
                      onClick={() => {
                        setSelected(r);
                        setResults([]);
                      }}
                      className="flex min-h-12 w-full items-center justify-between px-3 py-3 text-left hover:bg-plane"
                    >
                      <span className="min-w-0">
                        <span className="block truncate font-medium text-ink">
                          {r.name}
                        </span>
                        <span className="text-xs text-ink-muted">{r.symbol}</span>
                      </span>
                      <span className="text-[10px] uppercase text-ink-muted">
                        {r.type}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {/* Quantity + cost */}
        <div className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-muted">
              Quantity
            </label>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
              placeholder="0"
              className="min-h-12 w-full rounded-lg border border-hairline bg-surface-2 px-3 py-3 text-base text-ink outline-none focus:border-s-1 sm:min-h-0 sm:py-2 sm:text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wide text-ink-muted">
              Avg. buy price
            </label>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={avgCost}
              onChange={(e) => setAvgCost(e.target.value)}
              placeholder="0.00"
              className="min-h-12 w-full rounded-lg border border-hairline bg-surface-2 px-3 py-3 text-base text-ink outline-none focus:border-s-1 sm:min-h-0 sm:py-2 sm:text-sm"
            />
          </div>
        </div>

        <button
          type="button"
          disabled={!canSubmit}
          onClick={submit}
          className="mt-5 min-h-12 w-full rounded-pill bg-accent py-3 text-sm font-semibold text-onacc transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Add to portfolio
        </button>
      </div>
    </div>
  );
}
