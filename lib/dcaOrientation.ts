/**
 * Map technical advice → DCA stance.
 * Trade Brain orients sparplans, it doesn't call discretionary trades.
 */

import type { Advice, DcaPlan, Recommendation } from "@/lib/types";

export type DcaStance = "renforcer" | "maintenir" | "alleger" | "inconnu";

export type DcaOrientation = {
  stance: DcaStance;
  label: string;
  detail: string;
  recommendation: Recommendation | null;
};

const STANCE_LABEL: Record<DcaStance, string> = {
  renforcer: "Renforcer",
  maintenir: "Maintenir",
  alleger: "Alléger",
  inconnu: "—",
};

export function stanceLabel(stance: DcaStance): string {
  return STANCE_LABEL[stance];
}

export function orientDca(
  recommendation: Recommendation | null | undefined,
  opts: { circuitActive?: boolean; planActive?: boolean } = {},
): DcaOrientation {
  const rec = recommendation ?? null;
  if (!rec) {
    return {
      stance: "inconnu",
      label: STANCE_LABEL.inconnu,
      detail: "Pas de cotation fiable — garde le rythme si le sparplan te convient.",
      recommendation: null,
    };
  }

  if (opts.circuitActive && (rec === "BUY" || rec === "STRONG_BUY")) {
    return {
      stance: "maintenir",
      label: STANCE_LABEL.maintenir,
      detail: "Frein mensuel actif — pas d’augmentation de DCA pour l’instant.",
      recommendation: rec,
    };
  }

  if (rec === "STRONG_BUY") {
    return {
      stance: "renforcer",
      label: STANCE_LABEL.renforcer,
      detail: "Tendance favorable — candidat à un sparplan plus généreux.",
      recommendation: rec,
    };
  }
  if (rec === "BUY") {
    return {
      stance: "renforcer",
      label: STANCE_LABEL.renforcer,
      detail: "Biais positif — garder / un peu augmenter le rythme.",
      recommendation: rec,
    };
  }
  if (rec === "HOLD") {
    return {
      stance: "maintenir",
      label: STANCE_LABEL.maintenir,
      detail: "Neutre — continuer le DCA sans changer le montant.",
      recommendation: rec,
    };
  }
  if (rec === "SELL") {
    return {
      stance: "alleger",
      label: STANCE_LABEL.alleger,
      detail: "Biais négatif — réduire le montant ou espacer, pas forcément vendre.",
      recommendation: rec,
    };
  }
  // STRONG_SELL
  return {
    stance: "alleger",
    label: STANCE_LABEL.alleger,
    detail: "Tendance faible — envisager pause / forte baisse du sparplan.",
    recommendation: rec,
  };
}

/** Match a DCA plan to market advice via symbol or external key. */
export function adviceForPlan(
  plan: DcaPlan,
  rows: Array<{
    holding: { symbol: string; externalKey?: string };
    advice: Advice | null;
  }>,
): Advice | null {
  const sym = plan.symbol.toUpperCase();
  const key = plan.externalKey?.toUpperCase();
  const hit = rows.find((r) => {
    if (r.holding.symbol.toUpperCase() === sym) return true;
    if (key && r.holding.externalKey?.toUpperCase() === key) return true;
    return false;
  });
  return hit?.advice ?? null;
}
