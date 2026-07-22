"use client";

import { useEffect } from "react";
import { usePathname } from "next/navigation";
import { learnForPath } from "@/lib/learn";

export function GlossaryDrawer({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const pathname = usePathname();
  const section = learnForPath(pathname);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <>
      <div
        className="fixed inset-0 z-[60] bg-[var(--tb-overlay)] backdrop-blur-[2px]"
        onClick={onClose}
        aria-hidden
      />
      <aside
        className="animate-slide fixed inset-y-0 right-0 z-[61] w-[400px] max-w-[min(88vw,100%)] overflow-y-auto border-l border-line bg-card p-5 pt-[max(1.25rem,env(safe-area-inset-top))] shadow-[-24px_0_60px_rgba(15,15,18,.14)] sm:p-7"
        role="dialog"
        aria-label="Glossaire"
      >
        <div className="mb-4 flex items-center justify-between">
          <span className="font-mono text-[10.5px] font-medium uppercase tracking-[0.09em] text-ink3">
            Glossaire
          </span>
          <button
            type="button"
            onClick={onClose}
            className="grid h-[30px] w-[30px] place-items-center rounded-pill border border-line bg-card text-[15px] leading-none text-ink2 hover:text-ink"
            aria-label="Fermer"
          >
            ×
          </button>
        </div>
        <h2 className="text-xl font-bold tracking-tight text-ink">
          {section.title}
        </h2>
        <p className="mb-2 mt-1 text-[13px] text-ink2">{section.intro}</p>
        <dl>
          {section.tips.map((t) => (
            <div key={t.term} className="border-b border-line py-3.5">
              <dt className="text-sm font-semibold text-ink">{t.term}</dt>
              <dd className="mt-1 text-[13px] leading-relaxed text-ink2">
                {t.plain}
              </dd>
              {t.tip && (
                <dd className="mt-1 text-xs text-ink3">{t.tip}</dd>
              )}
            </div>
          ))}
        </dl>
      </aside>
    </>
  );
}
