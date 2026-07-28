"use client";

import { useEffect, useRef, useState } from "react";
import { formatCurrency, formatQuantity } from "@/lib/format";
import type { DcaPlan, Holding } from "@/lib/types";
import {
  guessYahooSymbol,
  isIsin,
  positionsFromTradeRepublicCsv,
  preferTrMarkOnly,
  type TrDcaPlan,
  type TrParseResult,
  type TrPosition,
} from "@/lib/tradeRepublicCsv";

type PreviewRow = {
  position: TrPosition;
  yahooSymbol: string;
  resolvedName: string;
  status: "ok" | "pending" | "unresolved";
};

export function ImportCsvDialog({
  open,
  onClose,
  onImport,
}: {
  open: boolean;
  onClose: () => void;
  onImport: (
    holdings: Array<
      Omit<Holding, "id" | "addedAt" | "source"> & { externalKey: string }
    >,
    dcas: Array<Omit<DcaPlan, "id">>,
    meta?: { csvFirstDate: string | null; csvLastDate: string | null },
  ) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [error, setError] = useState<string | null>(null);
  const parseMetaRef = useRef<{
    csvFirstDate: string | null;
    csvLastDate: string | null;
  } | null>(null);
  const [meta, setMeta] = useState<{
    trades: number;
    skipped: number;
    cashEur: number;
    costEur: number;
    dcaCount: number;
    dcaMonthly: number;
    csvFirstDate: string | null;
    csvLastDate: string | null;
  } | null>(null);
  const [preview, setPreview] = useState<PreviewRow[]>([]);
  const [dcaPreview, setDcaPreview] = useState<TrDcaPlan[]>([]);
  const [resolving, setResolving] = useState(false);
  const [fileName, setFileName] = useState<string | null>(null);
  const symbolMapRef = useRef<Record<string, { symbol: string; name: string }>>(
    {},
  );

  useEffect(() => {
    if (!open) {
      setError(null);
      setMeta(null);
      setPreview([]);
      setDcaPreview([]);
      setResolving(false);
      setFileName(null);
      parseMetaRef.current = null;
      symbolMapRef.current = {};
      if (inputRef.current) inputRef.current.value = "";
    }
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  const resolvePositions = async (
    positions: TrPosition[],
    dcas: TrDcaPlan[],
  ) => {
    setResolving(true);
    const rows: PreviewRow[] = positions.map((p) => ({
      position: p,
      yahooSymbol: guessYahooSymbol(p.symbolRaw, p.assetClass),
      resolvedName: p.name,
      status:
        preferTrMarkOnly(p.symbolRaw, p.assetClass) || !isIsin(p.symbolRaw)
          ? ("ok" as const)
          : ("pending" as const),
    }));
    setPreview(rows);
    setDcaPreview(dcas);

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const mapped = guessYahooSymbol(
        row.position.symbolRaw,
        row.position.assetClass,
      );
      // Bonds / private / wrong-unit equities: keep TR mark, no Yahoo resolve.
      if (
        preferTrMarkOnly(row.position.symbolRaw, row.position.assetClass) ||
        !isIsin(mapped)
      ) {
        rows[i] = { ...row, yahooSymbol: mapped, status: "ok" };
        symbolMapRef.current[row.position.externalKey] = {
          symbol: mapped,
          name: row.position.name,
        };
        setPreview([...rows]);
        continue;
      }
      try {
        const res = await fetch(
          `/api/resolve?q=${encodeURIComponent(row.position.symbolRaw)}&assetClass=${encodeURIComponent(row.position.assetClass)}`,
        );
        const json = await res.json();
        if (json.symbol) {
          rows[i] = {
            ...row,
            yahooSymbol: json.symbol,
            resolvedName: json.name || row.position.name,
            status: "ok",
          };
          symbolMapRef.current[row.position.externalKey] = {
            symbol: json.symbol,
            name: json.name || row.position.name,
          };
        } else {
          rows[i] = { ...row, status: "unresolved" };
          symbolMapRef.current[row.position.externalKey] = {
            symbol: row.position.symbolRaw,
            name: row.position.name,
          };
        }
      } catch {
        rows[i] = { ...row, status: "unresolved" };
        symbolMapRef.current[row.position.externalKey] = {
          symbol: row.position.symbolRaw,
          name: row.position.name,
        };
      }
      setPreview([...rows]);
      await new Promise((r) => setTimeout(r, 120));
    }

    // Resolve DCA-only symbols (sold positions that still had a plan).
    for (const d of dcas) {
      if (symbolMapRef.current[d.externalKey]) continue;
      const mapped = guessYahooSymbol(d.symbolRaw, d.assetClass);
      if (!isIsin(mapped)) {
        symbolMapRef.current[d.externalKey] = { symbol: mapped, name: d.name };
        continue;
      }
      try {
        const res = await fetch(
          `/api/resolve?q=${encodeURIComponent(d.symbolRaw)}&assetClass=${encodeURIComponent(d.assetClass)}`,
        );
        const json = await res.json();
        symbolMapRef.current[d.externalKey] = {
          symbol: json.symbol || d.symbolRaw,
          name: json.name || d.name,
        };
      } catch {
        symbolMapRef.current[d.externalKey] = {
          symbol: d.symbolRaw,
          name: d.name,
        };
      }
      await new Promise((r) => setTimeout(r, 120));
    }

    setResolving(false);
  };

  const onFile = async (file: File) => {
    setError(null);
    setFileName(file.name);
    try {
      const text = await file.text();
      const result: TrParseResult = positionsFromTradeRepublicCsv(text);
      const costEur = result.positions.reduce(
        (a, p) => a + p.quantity * p.avgCost,
        0,
      );
      const dcaMonthly = result.dcaPlans
        .filter((d) => d.active)
        .reduce((a, d) => a + d.monthlyEur, 0);
      parseMetaRef.current = {
        csvFirstDate: result.csvFirstDate,
        csvLastDate: result.csvLastDate,
      };
      setMeta({
        trades: result.tradeCount,
        skipped: result.skippedRows,
        cashEur: result.cashEur,
        costEur,
        dcaCount: result.dcaPlans.length,
        dcaMonthly,
        csvFirstDate: result.csvFirstDate,
        csvLastDate: result.csvLastDate,
      });
      if (result.positions.length === 0 && result.dcaPlans.length === 0) {
        setPreview([]);
        setDcaPreview([]);
        setError("Aucune position ni sparplan trouvé. Vérifie le fichier.");
        return;
      }
      await resolvePositions(result.positions, result.dcaPlans);
    } catch (err) {
      setPreview([]);
      setDcaPreview([]);
      setMeta(null);
      parseMetaRef.current = null;
      setError(err instanceof Error ? err.message : "Import impossible");
    }
  };

  const canApply =
    (preview.length > 0 || dcaPreview.length > 0) &&
    !resolving &&
    preview.every((r) => r.status !== "pending");

  const apply = () => {
    if (!canApply) return;
    // Keep Trade Republic display names — Yahoo/EODHD names are often cryptic.
    const holdings = preview.map((r) => ({
      symbol: r.yahooSymbol,
      name: r.position.name || r.resolvedName,
      quantity: r.position.quantity,
      avgCost: r.position.avgCost,
      lastPriceEur: r.position.lastPriceEur,
      externalKey: r.position.externalKey,
      accountType: r.position.accountType,
      assetClass: r.position.assetClass,
      pendingCashEur: r.position.pendingCashEur || undefined,
      preferTrMark: r.position.preferTrMark || undefined,
    }));
    const dcas: Array<Omit<DcaPlan, "id">> = dcaPreview.map((d) => {
      const mapped = symbolMapRef.current[d.externalKey];
      return {
        symbol: mapped?.symbol || guessYahooSymbol(d.symbolRaw, d.assetClass),
        name: d.name || mapped?.name || d.symbolRaw,
        externalKey: d.externalKey,
        amountEur: d.amountEur,
        cadence: d.cadence,
        active: d.active,
        executionCount: d.executionCount,
        totalInvestedEur: d.totalInvestedEur,
        firstDate: d.firstDate,
        lastDate: d.lastDate,
        monthlyEur: d.monthlyEur,
      };
    });
    onImport(holdings, dcas, parseMetaRef.current ?? undefined);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center p-0 backdrop-blur-sm sm:items-start sm:p-4 sm:pt-[8vh]"
      style={{ background: "var(--tb-overlay)" }}
      onClick={onClose}
    >
      <div
        className="animate-in flex max-h-[92dvh] w-full max-w-lg flex-col rounded-t-2xl border border-hairline bg-surface shadow-2xl sm:max-h-[84vh] sm:rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between gap-3 border-b border-hairline px-5 py-4">
          <div className="min-w-0">
            <h2 className="text-lg font-semibold text-ink">
              Import Trade Republic
            </h2>
            <p className="mt-0.5 text-xs text-ink-muted">
              Revue mensuelle — réimporter remplace, ne cumule pas.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="touch-target grid shrink-0 place-items-center rounded-pill text-[18px] text-ink-muted hover:bg-surface-2 hover:text-ink"
            aria-label="Fermer"
          >
            ✕
          </button>
        </div>

        <div className="space-y-4 overflow-y-auto px-5 py-4">
          <ol className="list-decimal space-y-1 pl-4 text-xs text-ink-muted">
            <li>App TR → Profil → Kontoauszüge / Account Statements</li>
            <li>Transaktionsexport → Create → télécharge le CSV</li>
            <li>Dépose le fichier ici</li>
          </ol>

          <label
            className="flex min-h-[7.5rem] cursor-pointer flex-col items-center justify-center rounded-xl border border-dashed border-hairline bg-surface-2 px-4 py-8 text-center hover:border-s-1"
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
            }}
            onDrop={(e) => {
              e.preventDefault();
              e.stopPropagation();
              const f = e.dataTransfer.files?.[0];
              if (f) void onFile(f);
            }}
          >
            <span className="text-sm font-medium text-ink">
              {fileName ?? "Choisir Transaktionsexport.csv"}
            </span>
            <span className="mt-1 text-xs text-ink-muted">
              ou glisser-déposer
            </span>
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) void onFile(f);
              }}
            />
          </label>

          {error && (
            <p className="rounded-lg bg-critical/10 px-3 py-2 text-sm text-critical">
              {error}
            </p>
          )}

          {meta && (
            <p className="text-xs text-ink-muted">
              {preview.length} positions · {meta.dcaCount} DCA
              {meta.dcaCount
                ? ` (≈ ${formatCurrency(meta.dcaMonthly, "EUR", {
                    compact: true,
                  })}/mois actifs)`
                : ""}{" "}
              · cash ≈{" "}
              {formatCurrency(meta.cashEur, "EUR", { compact: true })}
              {meta.csvFirstDate && meta.csvLastDate
                ? ` · CSV ${meta.csvFirstDate} → ${meta.csvLastDate}`
                : ""}
              {resolving ? " · résolution…" : ""}
            </p>
          )}

          {dcaPreview.length > 0 && (
            <div>
              <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Sparplans détectés
              </h3>
              <ul className="divide-y divide-hairline rounded-xl border border-hairline">
                {dcaPreview.slice(0, 8).map((d) => (
                  <li
                    key={d.externalKey}
                    className="flex items-center gap-3 px-3 py-2 text-sm"
                  >
                    <div className="min-w-0 flex-1 truncate">
                      <span className="font-medium text-ink">{d.name}</span>
                      {!d.active && (
                        <span className="ml-2 text-[10px] text-ink-muted">
                          pause
                        </span>
                      )}
                    </div>
                    <div className="shrink-0 tabular text-xs text-ink-secondary">
                      {d.amountEur} € · {d.cadence}
                    </div>
                  </li>
                ))}
                {dcaPreview.length > 8 && (
                  <li className="px-3 py-2 text-xs text-ink-muted">
                    +{dcaPreview.length - 8} autres…
                  </li>
                )}
              </ul>
            </div>
          )}

          {preview.length > 0 && (
            <div>
              <h3 className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-ink-muted">
                Positions
              </h3>
              <ul className="divide-y divide-hairline rounded-xl border border-hairline">
                {preview.map((r) => (
                  <li
                    key={r.position.externalKey}
                    className="flex items-center gap-3 px-3 py-2.5 text-sm"
                  >
                    <div className="min-w-0 flex-1">
                      <div className="font-medium text-ink truncate">
                        {r.position.name}
                        {r.status === "unresolved" && (
                          <span className="ml-2 text-[10px] font-normal text-warning">
                            ISIN non résolu
                          </span>
                        )}
                      </div>
                      <div className="truncate text-xs text-ink-muted">
                        {r.yahooSymbol}
                      </div>
                    </div>
                    <div className="text-right tabular text-xs text-ink-secondary">
                      <div>
                        {formatQuantity(r.position.quantity)} u
                      </div>
                      <div className="text-ink-muted">
                        @ {formatCurrency(r.position.avgCost, "EUR")}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <div className="border-t border-hairline px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-4">
          <button
            type="button"
            disabled={!canApply}
            onClick={apply}
            className="min-h-12 w-full rounded-pill bg-accent py-3 text-sm font-semibold text-onacc transition enabled:hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-40"
          >
            Remplacer positions + DCA
          </button>
        </div>
      </div>
    </div>
  );
}
