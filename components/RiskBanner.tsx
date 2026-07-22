"use client";

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
    <div className="space-y-2">
      {showCircuit && (
        <div
          className={`rounded-xl border px-4 py-3 text-sm ${
            circuit.level === "halt"
              ? "border-critical/40 bg-critical/10 text-ink"
              : "border-warning/40 bg-warning/10 text-ink"
          }`}
        >
          <div className="font-semibold">
            {circuit.level === "halt"
              ? "Circuit breaker — pas de nouvel achat"
              : "Prudence — exposition à surveiller"}
          </div>
          <ul className="mt-1 space-y-0.5 text-xs text-ink-secondary">
            {circuit.reasons.map((r) => (
              <li key={r}>{r}</li>
            ))}
            {circuit.level === "halt" && (
              <li>
                Les signaux Strong Buy / Buy sont mis en retrait jusqu’à
                normalisation.
              </li>
            )}
          </ul>
        </div>
      )}

      {showConc && (
        <div className="rounded-xl border border-warning/40 bg-warning/10 px-4 py-3 text-sm text-ink">
          <div className="font-semibold">Concentration</div>
          <ul className="mt-1 space-y-0.5 text-xs text-ink-secondary">
            {concentration.alerts.map((a) => (
              <li key={a.id}>
                {a.name} : {formatPercent(a.weightPct, false)}
                {a.severity === "hard" ? " — trop lourd" : " — élevé"}
              </li>
            ))}
            {concentration.top3Warn && (
              <li>
                Top 3 = {formatPercent(concentration.top3Pct, false)} du
                portefeuille
              </li>
            )}
          </ul>
        </div>
      )}
    </div>
  );
}
