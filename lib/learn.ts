/**
 * Pedagogue copy for the right-hand learn rail.
 * Expand abbreviations; stay concise — not a beginner tutorial.
 */

export type LearnTip = {
  term: string;
  plain: string;
  tip?: string;
};

export type LearnSection = {
  title: string;
  intro: string;
  tips: LearnTip[];
};

const PORTFOLIO: LearnSection = {
  title: "Portefeuille",
  intro: "Glossaire des libellés affichés à gauche.",
  tips: [
    {
      term: "Valeur",
      plain:
        "Valorisation au dernier cours disponible (marché, sinon mark Trade Republic).",
    },
    {
      term: "P&L — profit & loss",
      plain:
        "Plus ou moins-value latente vs PRU (prix de revient unitaire). Réalisé seulement à la vente.",
    },
    {
      term: "Aujourd’hui",
      plain: "Variation vs clôture de la veille, pas vs ton prix d’achat.",
    },
    {
      term: "PEA / CT",
      plain:
        "PEA = plan d’épargne en actions. CT = compte-titres. Même ISIN peut exister dans les deux enveloppes.",
    },
    {
      term: "SMA200 — moyenne mobile 200 jours",
      plain:
        "Moyenne des clôtures sur ~200 séances. Filtre de tendance longue : cours au-dessus = biais haussier, en dessous = baissier.",
    },
    {
      term: "Régime",
      plain:
        "Part des lignes au-dessus de leur SMA200 (+ biais crypto). Risk-off = peu d’actifs en tendance haussière longue.",
    },
    {
      term: "Concentration",
      plain: "Poids d’une ligne (ou du top 3) trop élevé → risque idiosyncratique.",
    },
    {
      term: "Circuit breaker",
      plain:
        "Coupe les Buy si le portefeuille chute fort en peu de temps (ex. ≤ −3 % sur la journée, ou ≈ −8 % sur ~20 jours). Limite le rattrapage à chaud.",
    },
  ],
};

const SIGNALS: LearnSection = {
  title: "Signaux",
  intro: "Heuristiques sur le prix uniquement — pas un conseil d’investissement.",
  tips: [
    {
      term: "Buy / Sell / Hold",
      plain:
        "Favorable / défavorable / neutre. Strong = consensus plus net entre facteurs.",
    },
    {
      term: "Score",
      plain:
        "Agrégat −100…+100. Confiance = alignement des facteurs (pas une proba de gain).",
    },
    {
      term: "SMA20 / 50 / 200",
      plain:
        "Simple Moving Average : moyenne des clôtures sur N jours. Court = bruit ; 200 = tendance de fond.",
    },
    {
      term: "RSI — Relative Strength Index",
      plain:
        "Oscillateur 0–100 sur le momentum récent. Zone haute = extension haussière ; basse = extension baissière.",
    },
    {
      term: "Sizing",
      plain:
        "Taille d’ajout pour ~1 % de risque portefeuille si stop touché (souvent sous SMA50).",
    },
    {
      term: "Non géré",
      plain:
        "Pas de cotation live fiable (oblig., private equity…) : mark TR, pas de signal.",
    },
  ],
};

const DCA: LearnSection = {
  title: "DCA",
  intro: "Dollar-cost averaging = versements réguliers, indépendamment du cours.",
  tips: [
    {
      term: "Sparplan",
      plain: "Ordre récurrent Trade Republic — l’équivalent opérationnel du DCA.",
    },
    {
      term: "Actif / pause",
      plain:
        "Actif = exécutions récentes dans le CSV. Pause = plus de flux détecté.",
    },
    {
      term: "Rythme / mois",
      plain: "Extrapolation du flux mensuel des plans encore actifs.",
    },
  ],
};

const JOURNAL: LearnSection = {
  title: "Journal",
  intro:
    "Trace les Buy/Sell en SQLite (fichier local data/trade-brain.sqlite) pour mesurer a posteriori la qualité des signaux.",
  tips: [
    {
      term: "Persistance",
      plain:
        "Écrit via l’API au refresh marché — pas de cron. Le fichier SQLite survit aux rechargements / changements de navigateur sur la même machine serveur.",
    },
    {
      term: "Snapshot",
      plain: "Enregistrement du jour : signal + prix. Une ligne par position / jour.",
    },
    {
      term: "J+5 / J+20",
      plain:
        "Performance N jours après le snapshot. Buy OK si prix ↑ ; Sell OK si prix ↓. “…” tant que le délai n’est pas écoulé.",
    },
    {
      term: "Hit rate",
      plain: "Taux de réussite historique à J+5 sur l’échantillon journalisé.",
    },
  ],
};

const ASSET: LearnSection = {
  title: "Actif",
  intro: "Détail d’une ligne et des facteurs du signal.",
  tips: [
    {
      term: "PRU — prix de revient unitaire",
      plain: "Coût moyen par part. Base du P&L vs cours actuel.",
    },
    {
      term: "Poids",
      plain: "Part de la ligne dans le portefeuille total.",
    },
    {
      term: "SMA / RSI",
      plain:
        "SMA = moyenne mobile (N jours). RSI = Relative Strength Index (momentum 0–100).",
    },
    {
      term: "Facteurs",
      plain: "Arguments pour/contre le signal — checklist, pas ordre de marché.",
    },
  ],
};

export function learnForPath(pathname: string): LearnSection {
  if (pathname.startsWith("/signals")) return SIGNALS;
  if (pathname.startsWith("/dca")) return DCA;
  if (pathname.startsWith("/journal")) return JOURNAL;
  if (pathname.startsWith("/asset/")) return ASSET;
  return PORTFOLIO;
}
