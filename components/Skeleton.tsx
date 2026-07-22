/** Pulse placeholder for loading states. */
export function Skeleton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`inline-block animate-pulse rounded-md bg-surface-2 ${className}`}
    />
  );
}

export function SkeletonStatTile({ label }: { label: string }) {
  return (
    <div className="rounded-xl border border-hairline bg-surface p-4">
      <div className="text-xs font-medium uppercase tracking-wide text-ink-muted">
        {label}
      </div>
      <Skeleton className="mt-2 h-8 w-28" />
      <Skeleton className="mt-2 h-4 w-20" />
    </div>
  );
}

/** Full portfolio page placeholder before localStorage + first quotes. */
export function PortfolioSkeleton() {
  return (
    <div className="space-y-6" aria-busy="true" aria-label="Chargement">
      <div>
        <Skeleton className="h-7 w-36" />
        <Skeleton className="mt-2 h-4 w-48" />
      </div>

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {["Valeur", "P&L total", "Aujourd’hui", "DCA actifs"].map((l) => (
          <SkeletonStatTile key={l} label={l} />
        ))}
      </section>

      <section className="rounded-xl border border-hairline bg-surface p-4">
        <Skeleton className="mb-3 h-4 w-32" />
        <ul className="space-y-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <li key={i} className="flex justify-between gap-3">
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-28" />
                <Skeleton className="h-3 w-20" />
              </div>
              <Skeleton className="h-4 w-16" />
            </li>
          ))}
        </ul>
      </section>

      <section className="grid gap-4 lg:grid-cols-5">
        <div className="rounded-xl border border-hairline bg-surface p-4 lg:col-span-2">
          <Skeleton className="mb-4 h-4 w-24" />
          <Skeleton className="mx-auto h-40 w-40 rounded-full" />
        </div>
        <div className="rounded-xl border border-hairline bg-surface p-4 lg:col-span-3">
          <Skeleton className="mb-4 h-4 w-28" />
          <ul className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <li key={i} className="flex justify-between gap-3">
                <div className="space-y-1.5">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-52" />
                </div>
                <Skeleton className="h-4 w-14" />
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="overflow-hidden rounded-xl border border-hairline bg-surface">
        <div className="border-b border-hairline px-4 py-3">
          <Skeleton className="h-4 w-24" />
        </div>
        <div className="divide-y divide-hairline">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="grid grid-cols-[2fr_1fr_1fr_1fr] gap-4 px-4 py-3 md:grid-cols-[2fr_1fr_1fr_1fr_1fr_1fr]"
            >
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-40" />
              </div>
              <Skeleton className="h-4 w-16" />
              <Skeleton className="hidden h-8 w-20 md:block" />
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
              <Skeleton className="h-5 w-14" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
