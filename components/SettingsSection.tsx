/** Shared frame for a settings block, so every section reads the same. */
export function SettingsSection({
  title,
  description,
  children,
  action,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
  action?: React.ReactNode;
}) {
  return (
    <section className="rounded-card border border-line bg-card p-4 shadow-soft sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-[15px] font-semibold text-ink">{title}</h2>
          {description && (
            <p className="mt-0.5 max-w-prose text-[12.5px] leading-relaxed text-ink2">
              {description}
            </p>
          )}
        </div>
        {action}
      </div>
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** Label / value pair used across the account section. */
export function SettingsRow({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-b border-line py-2.5 last:border-b-0 last:pb-0 first:pt-0">
      <span className="text-[13px] text-ink2">{label}</span>
      <span className="text-[13px] font-semibold text-ink">{children}</span>
    </div>
  );
}
