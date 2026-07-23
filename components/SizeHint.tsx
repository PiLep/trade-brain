"use client";

import type { PositionSize } from "@/lib/risk";
import { formatCurrency, formatPercent, formatQuantity } from "@/lib/format";

/** Readable “how much to add” card for Buy signals. */
export function SizeHint({
  size,
  currency,
  blocked,
}: {
  size: PositionSize | null;
  currency: string;
  blocked?: boolean;
}) {
  if (blocked) {
    return (
      <Note tone="warn">
        Circuit breaker actif — pas de taille d’achat suggérée pour l’instant.
      </Note>
    );
  }
  if (!size) return null;

  if (size.notional <= 0) {
    return (
      <Note tone="warn">
        <p className="font-semibold">Achat bloqué</p>
        <p className="mt-1 text-[12.5px] leading-relaxed opacity-90">
          {size.note ||
            "Cette ligne est déjà au plafond de concentration."}
        </p>
      </Note>
    );
  }

  return (
    <Note tone="accent">
      <p className="font-semibold text-ink">
        Ajouter jusqu’à{" "}
        <span className="tabular">
          {formatCurrency(size.notional, currency)}
        </span>
        <span className="font-medium text-ink2">
          {" "}
          ({formatQuantity(size.units)} parts)
        </span>
      </p>

      <dl className="mt-2.5 space-y-2 text-[12.5px]">
        <Row
          label="Stop"
          value={`~ ${formatCurrency(size.stop, currency)}`}
          hint="Niveau de sortie si le scénario d’achat échoue"
        />
        <Row
          label="Risque"
          value={`${formatCurrency(size.riskAmount, currency)} · ${formatPercent(size.riskPct, false)}`}
          hint="Perte estimée sur cet ajout si le stop est touché"
        />
        <Row
          label="Poids"
          value={formatPercent(size.currentWeightPct, false)}
          hint="Part actuelle de cette ligne dans le portefeuille"
        />
      </dl>

      {size.capped && (
        <p className="mt-2.5 border-t border-[color-mix(in_srgb,var(--tb-accent)_18%,transparent)] pt-2 text-[12px] leading-relaxed text-ink2">
          Montant réduit pour rester sous le plafond de concentration (10 % par
          titre).
        </p>
      )}
    </Note>
  );
}

function Note({
  tone,
  children,
}: {
  tone: "accent" | "warn";
  children: React.ReactNode;
}) {
  const cls =
    tone === "warn"
      ? "bg-[color-mix(in_srgb,var(--tb-warn)_11%,transparent)] text-warn"
      : "bg-[color-mix(in_srgb,var(--tb-accent)_8%,transparent)] text-ink";
  return (
    <div className={`rounded-[12px] px-3.5 py-3 ${cls}`}>{children}</div>
  );
}

function Row({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) {
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <dt className="font-medium text-ink2">{label}</dt>
        <dd className="font-semibold tabular text-ink">{value}</dd>
      </div>
      <dd className="mt-0.5 text-[11.5px] leading-snug text-ink3">{hint}</dd>
    </div>
  );
}
