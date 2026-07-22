"use client";

import { usePathname } from "next/navigation";
import { learnForPath } from "@/lib/learn";

/**
 * Right-hand pedagogy rail (xl+). Uses empty side space; hidden on small screens
 * so the main UI stays light.
 */
export function LearnRail() {
  const pathname = usePathname();
  const section = learnForPath(pathname);

  return (
    <aside
      className="hidden xl:block"
      aria-label="Explications"
    >
      <div className="sticky top-20 max-h-[calc(100vh-6rem)] overflow-y-auto pr-1">
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-ink-muted">
          Glossaire
        </p>
        <h2 className="mt-1 text-base font-semibold leading-snug text-ink">
          {section.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-ink-secondary">
          {section.intro}
        </p>

        <dl className="mt-6 space-y-5 border-t border-hairline pt-5">
          {section.tips.map((t) => (
            <div key={t.term}>
              <dt className="text-sm font-semibold text-ink">{t.term}</dt>
              <dd className="mt-1 text-sm leading-relaxed text-ink-secondary">
                {t.plain}
              </dd>
              {t.tip && (
                <dd className="mt-1.5 text-xs leading-relaxed text-ink-muted">
                  {t.tip}
                </dd>
              )}
            </div>
          ))}
        </dl>
      </div>
    </aside>
  );
}
