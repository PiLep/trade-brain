"use client";

import Link from "next/link";
import type { CircuitBreaker, ConcentrationReport } from "@/lib/risk";
import { formatPercent } from "@/lib/format";

export function RiskBanner({
  circuit,
  concentration,
}: {
  circuit: CircuitBreaker;
  concentration: ConcentrationReport;
}) {
  const showCircuit = circuit.level !== "ok";
  const showConc =
    concentration.alerts.length > 0 || concentration.top3Warn;
  if (!showCircuit && !showConc) return null;

  return (
    <div className="flex max-w-[660px] flex-col gap-2.5">
      {showCircuit && (
        <div
          className={`flex items-start gap-2.5 rounded-xl border px-3.5 py-2.5 text-[13px] ${
            circuit.level === "halt"
              ? "border-[color-mix(in_srgb,var(--tb-neg)_28%,transparent)] bg-[color-mix(in_srgb,var(--tb-neg)_10%,transparent)] text-neg"
              : "border-[color-mix(in_srgb,var(--tb-warn)_28%,transparent)] bg-warnbg text-warn"
          }`}
        >
          <WarnIcon />
          <div className="min-w-0 flex-1">
            <strong>
              {circuit.level === "halt"
                ? "Frein mensuel"
                : "Prudence"}
            </strong>
            {" — "}
            {circuit.reasons[0] ?? "Exposition à surveiller."}
          </div>
          <Link
            href="/signals"
            className="whitespace-nowrap text-[12.5px] font-semibold underline"
          >
            Voir les signaux
          </Link>
        </div>
      )}

      {showConc && (
        <div className="flex items-start gap-2.5 rounded-xl border border-[color-mix(in_srgb,var(--tb-warn)_28%,transparent)] bg-warnbg px-3.5 py-2.5 text-[13px] text-warn">
          <WarnIcon />
          <div className="min-w-0 flex-1">
            <strong>Concentration élevée</strong>
            {" — "}
            {concentration.alerts.length
              ? concentration.alerts
                  .map(
                    (a) =>
                      `${a.name} ${formatPercent(a.weightPct, false)}`,
                  )
                  .join(" · ") + " (plafond 15 %)."
              : `Top 3 = ${formatPercent(concentration.top3Pct, false)}.`}
          </div>
          <Link
            href="/signals"
            className="whitespace-nowrap text-[12.5px] font-semibold underline"
          >
            Voir les signaux
          </Link>
        </div>
      )}
    </div>
  );
}

function WarnIcon() {
  return (
    <svg
      width="15"
      height="15"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="mt-0.5 shrink-0"
      aria-hidden
    >
      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
      <line x1="12" y1="9" x2="12" y2="13" />
      <line x1="12" y1="17" x2="12.01" y2="17" />
    </svg>
  );
}
