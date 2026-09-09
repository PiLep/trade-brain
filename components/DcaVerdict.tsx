import Link from "next/link";

type Counts = {
  renforcer: number;
  maintenir: number;
  alleger: number;
  inconnu: number;
};

/**
 * The answer the product exists to give: for this month's review, how many
 * plans to reinforce, hold or trim.
 *
 * It used to live only on /dca while the landing page opened on the portfolio
 * total — an amount that changes no DCA decision. The portfolio is still here,
 * below, as the evidence you judge this verdict against.
 */
export function DcaVerdict({
  counts,
  month,
  blocked,
  loading,
}: {
  counts: Counts;
  month: string;
  /** Monthly circuit breaker is tripped: "renforcer" is off the table. */
  blocked: boolean;
  loading?: boolean;
}) {
  const total =
    counts.renforcer + counts.maintenir + counts.alleger + counts.inconnu;

  if (loading) {
    return (
      <div className="h-[104px] animate-pulse rounded-card border border-line bg-card shadow-soft" />
    );
  }

  if (total === 0) {
    return (
      <section className="rounded-card border border-line bg-card p-4 shadow-soft sm:p-5">
        <p className="text-[13px] text-ink2">
          Aucun plan DCA actif. Ajoute un sparplan pour recevoir une
          orientation mensuelle.
        </p>
      </section>
    );
  }

  const items = [
    {
      key: "renforcer",
      n: counts.renforcer,
      label: counts.renforcer === 1 ? "à renforcer" : "à renforcer",
      tone: "text-pos",
    },
    {
      key: "maintenir",
      n: counts.maintenir,
      label: "à maintenir",
      tone: "text-ink",
    },
    {
      key: "alleger",
      n: counts.alleger,
      label: counts.alleger === 1 ? "à alléger" : "à alléger",
      tone: "text-neg",
    },
  ].filter((i) => i.n > 0);

  return (
    <section
      aria-labelledby="verdict-title"
      className="rounded-card border border-line bg-card p-4 shadow-soft sm:p-5"
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2
          id="verdict-title"
          className="text-[13px] font-semibold uppercase tracking-wide text-ink2"
        >
          Ce mois — {month}
        </h2>
        <Link
          href="/dca"
          className="touch-target inline-flex items-center gap-1 text-[12.5px] font-semibold text-accent hover:underline"
        >
          Plan par plan
          <span aria-hidden>→</span>
        </Link>
      </div>

      <div className="mt-3 flex flex-wrap items-baseline gap-x-6 gap-y-2">
        {items.map((i) => (
          <p key={i.key} className="flex items-baseline gap-1.5">
            <span
              className={`text-[32px] font-semibold leading-none tabular ${i.tone}`}
            >
              {i.n}
            </span>
            <span className="text-[13.5px] text-ink2">
              {i.n === 1 ? "plan " : "plans "}
              {i.label}
            </span>
          </p>
        ))}
        {counts.inconnu > 0 && (
          <p className="text-[12.5px] text-ink3">
            {counts.inconnu} sans cotation fiable
          </p>
        )}
      </div>

      {blocked && counts.renforcer === 0 && (
        <p className="mt-3 rounded-[10px] bg-warnbg px-3 py-2 text-[12.5px] font-medium text-warn">
          Frein mensuel actif — les renforcements sont suspendus. Les sparplans
          déjà programmés continuent de s&apos;exécuter.
        </p>
      )}
    </section>
  );
}
