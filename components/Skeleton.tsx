/** Loading placeholders aligned with the redesign card layout. */

export function Skeleton({
  className = "",
}: {
  className?: string;
}) {
  return (
    <span
      aria-hidden
      className={`inline-block animate-pulse rounded-md bg-chip ${className}`}
    />
  );
}

function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-card border border-line bg-card p-[22px] shadow-soft ${className}`}
    >
      {children}
    </div>
  );
}

export function SkeletonStatTile({ label }: { label?: string }) {
  return (
    <div className="rounded-2xl border border-line bg-card px-5 py-[18px] shadow-soft">
      {label ? (
        <div className="font-mono text-[10px] font-medium uppercase tracking-[0.09em] text-ink3">
          {label}
        </div>
      ) : (
        <Skeleton className="h-2.5 w-16" />
      )}
      <Skeleton className="mt-3 h-7 w-28" />
      <Skeleton className="mt-2.5 h-3 w-20" />
    </div>
  );
}

function SignalCardSkeleton() {
  return (
    <Card className="space-y-3">
      <div className="flex items-center gap-2.5">
        <Skeleton className="h-6 w-16 rounded-pill" />
        <Skeleton className="h-4 w-36" />
        <Skeleton className="ml-auto h-4 w-14" />
      </div>
      <Skeleton className="h-3 w-full" />
      <Skeleton className="h-3 w-[72%]" />
      <Skeleton className="mt-1 h-16 w-full rounded-xl" />
    </Card>
  );
}

function TableRowSkeleton() {
  return (
    <div className="grid grid-cols-[1.7fr_.8fr_.9fr_1fr_1.1fr_1.5fr_1fr] items-center gap-3 border-t border-line px-[22px] py-3.5">
      <div className="space-y-2">
        <Skeleton className="h-3.5 w-32" />
        <Skeleton className="h-2.5 w-20" />
      </div>
      <Skeleton className="h-5 w-10 rounded-md" />
      <Skeleton className="ml-auto h-3.5 w-14" />
      <Skeleton className="mx-auto h-6 w-16" />
      <Skeleton className="ml-auto h-3.5 w-16" />
      <Skeleton className="ml-auto h-3.5 w-20" />
      <Skeleton className="ml-auto h-6 w-14 rounded-pill" />
    </div>
  );
}

/** Full portfolio page — mirrors hero + cards + table. */
export function PortfolioSkeleton() {
  return (
    <div
      className="animate-rise space-y-7"
      aria-busy="true"
      aria-label="Chargement"
    >
      <div className="grid items-stretch gap-6 lg:grid-cols-[1fr_360px]">
        <div className="flex flex-col justify-center gap-4 py-1.5">
          <Skeleton className="h-2.5 w-56" />
          <Skeleton className="h-14 w-64 max-w-full" />
          <div className="flex flex-wrap gap-2">
            <Skeleton className="h-8 w-48 rounded-pill" />
            <Skeleton className="h-8 w-44 rounded-pill" />
            <Skeleton className="h-8 w-40 rounded-pill" />
          </div>
          <Skeleton className="h-11 w-full max-w-[660px] rounded-xl" />
        </div>
        <Card className="flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <Skeleton className="h-2.5 w-28" />
            <Skeleton className="h-6 w-16 rounded-pill" />
          </div>
          <Skeleton className="h-10 w-20" />
          <Skeleton className="h-1.5 w-full rounded-pill" />
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-[85%]" />
          <div className="mt-1 space-y-2.5 border-t border-line pt-3">
            <div className="flex justify-between">
              <Skeleton className="h-3 w-36" />
              <Skeleton className="h-3 w-12" />
            </div>
            <div className="flex justify-between">
              <Skeleton className="h-3 w-24" />
              <Skeleton className="h-3 w-10" />
            </div>
          </div>
        </Card>
      </div>

      <div className="grid gap-5 lg:grid-cols-[5fr_4fr]">
        <Card>
          <div className="mb-5 flex items-baseline justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-20" />
          </div>
          <Skeleton className="mb-4 h-3 w-full rounded-pill" />
          <ul className="space-y-0">
            {Array.from({ length: 4 }).map((_, i) => (
              <li
                key={i}
                className="flex items-center gap-2.5 border-b border-line py-3.5 last:border-0"
              >
                <Skeleton className="h-2.5 w-2.5 shrink-0 rounded-[3px]" />
                <div className="min-w-0 flex-1 space-y-2">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-2.5 w-24" />
                </div>
                <div className="space-y-2 text-right">
                  <Skeleton className="ml-auto h-3.5 w-16" />
                  <Skeleton className="ml-auto h-2.5 w-10" />
                </div>
              </li>
            ))}
          </ul>
        </Card>

        <Card>
          <div className="mb-4 flex items-baseline justify-between">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-16" />
          </div>
          <ul className="space-y-0">
            {Array.from({ length: 3 }).map((_, i) => (
              <li
                key={i}
                className="space-y-2.5 border-b border-line py-3.5 last:border-0"
              >
                <div className="flex items-center gap-2">
                  <Skeleton className="h-6 w-14 rounded-pill" />
                  <Skeleton className="h-3.5 w-28" />
                  <Skeleton className="ml-auto h-3.5 w-12" />
                </div>
                <Skeleton className="h-3 w-full" />
                <Skeleton className="h-3 w-[70%]" />
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="overflow-hidden rounded-card border border-line bg-card shadow-soft">
        <div className="flex items-baseline gap-3 px-4 pb-3 pt-4 sm:px-[22px] lg:pb-3.5 lg:pt-5">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-3 w-40" />
        </div>
        <div className="flex flex-col lg:hidden">
          {Array.from({ length: 5 }).map((_, i) => (
            <div
              key={i}
              className="space-y-3 border-t border-line px-4 py-3.5"
            >
              <div className="flex justify-between gap-3">
                <div className="space-y-2">
                  <Skeleton className="h-3.5 w-32" />
                  <Skeleton className="h-2.5 w-20" />
                </div>
                <Skeleton className="h-6 w-14 rounded-pill" />
              </div>
              <div className="flex justify-between">
                <Skeleton className="h-4 w-20" />
                <Skeleton className="h-6 w-16" />
              </div>
            </div>
          ))}
        </div>
        <div className="hidden lg:block">
          <div className="grid grid-cols-[1.7fr_.8fr_.9fr_1fr_1.1fr_1.5fr_1fr] gap-3 px-[22px] py-2">
            {Array.from({ length: 7 }).map((_, i) => (
              <Skeleton key={i} className="h-2.5 w-12" />
            ))}
          </div>
          {Array.from({ length: 6 }).map((_, i) => (
            <TableRowSkeleton key={i} />
          ))}
        </div>
      </div>
    </div>
  );
}

export function SignalsCardsSkeleton({ count = 4 }: { count?: number }) {
  return (
    <div className="flex flex-col gap-3">
      {Array.from({ length: count }).map((_, i) => (
        <SignalCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function SignalsSkeleton() {
  return (
    <div
      className="animate-rise space-y-5"
      aria-busy="true"
      aria-label="Chargement"
    >
      <div className="space-y-2">
        <Skeleton className="h-8 w-32" />
        <Skeleton className="h-3.5 w-80 max-w-full" />
      </div>
      <div className="flex flex-wrap gap-2">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-9 w-24 rounded-pill" />
        ))}
      </div>
      <SignalsCardsSkeleton />
    </div>
  );
}

export function DcaSkeleton() {
  return (
    <div
      className="animate-rise space-y-6"
      aria-busy="true"
      aria-label="Chargement"
    >
      <div className="space-y-2">
        <Skeleton className="h-8 w-20" />
        <Skeleton className="h-3.5 w-64 max-w-full" />
      </div>
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatTile key={i} />
        ))}
      </section>
      <div className="flex flex-col gap-3 lg:hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="rounded-card border border-line bg-card px-4 py-3.5 shadow-soft"
          >
            <div className="flex justify-between gap-3">
              <div className="space-y-2">
                <Skeleton className="h-3.5 w-28" />
                <Skeleton className="h-2.5 w-20" />
              </div>
              <Skeleton className="h-6 w-14 rounded-pill" />
            </div>
            <div className="mt-3 flex justify-between">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-16" />
            </div>
            <Skeleton className="mt-3 h-6 w-24 rounded-pill" />
          </div>
        ))}
      </div>
      <div className="hidden overflow-hidden rounded-card border border-line bg-card shadow-soft lg:block">
        <div className="grid grid-cols-[1.8fr_.9fr_.9fr_1fr_1fr_.9fr] gap-3 px-[22px] pb-2 pt-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-2.5 w-14" />
          ))}
        </div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-[1.8fr_.9fr_.9fr_1fr_1fr_.9fr] items-center gap-3 border-t border-line px-[22px] py-3.5"
          >
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-2.5 w-16" />
            </div>
            <Skeleton className="h-5 w-10 rounded-md" />
            <Skeleton className="h-3.5 w-14" />
            <Skeleton className="ml-auto h-3.5 w-14" />
            <Skeleton className="ml-auto h-3.5 w-14" />
            <Skeleton className="ml-auto h-6 w-14 rounded-pill" />
          </div>
        ))}
      </div>
    </div>
  );
}

export function JournalSkeleton() {
  return (
    <div
      className="animate-rise space-y-6"
      aria-busy="true"
      aria-label="Chargement"
    >
      <div className="space-y-2">
        <Skeleton className="h-8 w-28" />
        <Skeleton className="h-3.5 w-72 max-w-full" />
      </div>
      <section className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <SkeletonStatTile key={i} />
        ))}
      </section>
      <div className="overflow-hidden rounded-card border border-line bg-card shadow-soft">
        {Array.from({ length: 6 }).map((_, i) => (
          <div
            key={i}
            className="grid grid-cols-[84px_auto_1fr] items-baseline gap-4 border-t border-line px-[22px] py-4 first:border-t-0"
          >
            <Skeleton className="h-3 w-14" />
            <Skeleton className="h-6 w-16 rounded-pill" />
            <div className="space-y-2">
              <Skeleton className="h-3.5 w-48 max-w-full" />
              <Skeleton className="h-2.5 w-40" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AssetSkeleton() {
  return (
    <div
      className="animate-rise space-y-5"
      aria-busy="true"
      aria-label="Chargement"
    >
      <Skeleton className="h-3.5 w-24" />
      <div className="grid gap-5 lg:grid-cols-5">
        <Card className="space-y-4 lg:col-span-3">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <Skeleton className="h-6 w-48" />
              <Skeleton className="h-3 w-24" />
            </div>
            <div className="space-y-2 text-right">
              <Skeleton className="ml-auto h-7 w-28" />
              <Skeleton className="ml-auto h-3 w-16" />
            </div>
          </div>
          <Skeleton className="h-[280px] w-full rounded-xl" />
        </Card>
        <div className="flex flex-col gap-5 lg:col-span-2">
          <Card className="space-y-3">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-[80%]" />
          </Card>
          <Card className="space-y-3">
            <Skeleton className="h-4 w-28" />
            <Skeleton className="h-3 w-full" />
            <Skeleton className="h-3 w-[90%]" />
            <Skeleton className="h-3 w-[70%]" />
          </Card>
        </div>
      </div>
    </div>
  );
}

/** Inline placeholders inside already-mounted portfolio cards. */
export function AllocationSkeleton() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-3 w-full rounded-pill" />
      <ul className="space-y-0">
        {Array.from({ length: 4 }).map((_, i) => (
          <li
            key={i}
            className="flex items-center gap-2.5 border-b border-line py-3.5 last:border-0"
          >
            <Skeleton className="h-2.5 w-2.5 shrink-0 rounded-[3px]" />
            <div className="min-w-0 flex-1 space-y-2">
              <Skeleton className="h-3.5 w-28" />
              <Skeleton className="h-2.5 w-20" />
            </div>
            <div className="space-y-2">
              <Skeleton className="ml-auto h-3.5 w-14" />
              <Skeleton className="ml-auto h-2.5 w-8" />
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function SignalsListSkeleton({ count = 3 }: { count?: number }) {
  return (
    <ul className="space-y-0">
      {Array.from({ length: count }).map((_, i) => (
        <li
          key={i}
          className="space-y-2.5 border-b border-line py-3.5 last:border-0"
        >
          <div className="flex items-center gap-2">
            <Skeleton className="h-6 w-14 rounded-pill" />
            <Skeleton className="h-3.5 w-28" />
            <Skeleton className="ml-auto h-3.5 w-12" />
          </div>
          <Skeleton className="h-3 w-full" />
          <Skeleton className="h-3 w-[70%]" />
        </li>
      ))}
    </ul>
  );
}
