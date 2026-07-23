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
  intro:
    "Contexte d’allocation. Trade Brain sert surtout à orienter tes sparplans.",
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
      term: "Ce mois",
      plain:
        "Performance marché depuis le 1er du mois. Contexte pour le frein — pas un suivi trading.",
    },
    {
      term: "PEA / CT",
      plain:
        "PEA = plan d’épargne en actions. CT = compte-titres. Même ISIN peut exister dans les deux enveloppes.",
    },
    {
      term: "Régime",
      plain:
        "Part des lignes au-dessus de leur SMA200 (+ biais crypto). Risk-off → prudence sur les renforcements DCA.",
    },
    {
      term: "Concentration",
      plain:
        "Poids trop élevé → éviter de renforcer encore ce sparplan.",
    },
    {
      term: "Circuit breaker",
      plain:
        "Coupe les « renforcer » si le mois est très négatif. Ne suspend jamais un sparplan déjà programmé chez TR.",
    },
  ],
};

const SIGNALS: LearnSection = {
  title: "Signaux",
  intro:
    "Heuristiques de prix pour décider le rythme DCA — pas un conseil d’achat/vente discrétionnaire.",
  tips: [
    {
      term: "Buy → renforcer",
      plain: "Candidat à un sparplan plus généreux (ou à en ouvrir un).",
    },
    {
      term: "Hold → maintenir",
      plain: "Garder le montant actuel, ne rien changer.",
    },
    {
      term: "Sell → alléger",
      plain:
        "Réduire le montant ou mettre en pause — pas forcément vendre la ligne.",
    },
    {
      term: "Score",
      plain:
        "Agrégat −100…+100. Confiance = alignement des facteurs (pas une proba de gain).",
    },
    {
      term: "SMA200",
      plain:
        "Filtre de tendance longue. Au-dessus = biais renforcer ; en dessous = prudence.",
    },
    {
      term: "Sizing",
      plain:
        "Ordre de grandeur si tu ajoutes du cash hors sparplan (~1 % de risque). Secondaire pour du pur DCA.",
    },
  ],
};

const DCA: LearnSection = {
  title: "Orientation DCA",
  intro:
    "Cœur du produit : décider où mettre (ou retirer) du flux mensuel régulier.",
  tips: [
    {
      term: "Sparplan",
      plain: "Ordre récurrent Trade Republic — l’équivalent opérationnel du DCA.",
    },
    {
      term: "Renforcer / maintenir / alléger",
      plain:
        "Stance dérivée du signal. Tu ajustes le montant ou la pause chez TR — Trade Brain ne passe aucun ordre.",
    },
    {
      term: "Projection / jour",
      plain:
        "Flux mensuel ÷ jours du mois. Pouls quotidien sans nouveau CSV — utile si tu fais surtout du DCA.",
    },
    {
      term: "CSV",
      plain:
        "Sert à lister les sparplans et l’historique. Pas besoin de le rafraîchir chaque mois si tu ne trades presque jamais hors DCA.",
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
      plain:
        "À chaque refresh marché : signal + prix. Sert à évaluer la revue mois après mois, pas le trading quotidien.",
    },
    {
      term: "J+5 / J+20",
      plain:
        "Performance N jours après le snapshot (jours de marché). Buy OK si prix ↑ ; Sell OK si prix ↓. “…” tant que le délai n’est pas écoulé.",
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
