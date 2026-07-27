"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { useTenant } from "@/lib/tenant";

export function TenantSwitcher() {
  const { loaded, tenant, tenants, setActive } = useTenant();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  if (!loaded || !tenant) {
    return (
      <div className="h-8 min-w-[7rem] animate-pulse rounded-pill bg-chip" />
    );
  }

  const switchTo = async (id: string) => {
    if (id === tenant.id || busy) return;
    setBusy(true);
    await setActive(id);
    setBusy(false);
    setOpen(false);
    // Reload client state for the new tenant scope.
    window.location.reload();
  };

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        disabled={busy}
        className="flex max-w-[11rem] items-center gap-1.5 rounded-pill border border-line bg-card px-2.5 py-1.5 text-[12px] font-semibold text-ink hover:border-ink3 sm:max-w-[14rem] sm:px-3 sm:text-[12.5px]"
        aria-label="Changer d’espace"
      >
        <span className="truncate">{tenant.name}</span>
        <span className="text-ink3" aria-hidden>
          ▾
        </span>
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 w-64 rounded-card border border-line bg-card p-2 shadow-soft sm:w-72">
          <p className="px-2 py-1 text-[11px] font-semibold uppercase tracking-wide text-ink3">
            Espaces
          </p>
          <ul className="mt-0.5 flex flex-col gap-0.5">
            {tenants.map((t) => {
              const active = t.id === tenant.id;
              return (
                <li key={t.id}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => void switchTo(t.id)}
                    className={`flex w-full items-center justify-between rounded-[10px] px-2.5 py-2 text-left text-[13px] font-semibold transition ${
                      active
                        ? "bg-chip text-ink"
                        : "text-ink2 hover:bg-chip hover:text-ink"
                    }`}
                  >
                    <span className="truncate">{t.name}</span>
                    {active && (
                      <span className="ml-2 text-[11px] text-accent">actif</span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
          <div className="mt-2 border-t border-line pt-2">
            <Link
              href="/tenants"
              onClick={() => setOpen(false)}
              className="block rounded-[10px] px-2.5 py-2 text-[12.5px] font-semibold text-ink2 hover:bg-chip hover:text-ink"
            >
              Gérer les espaces
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
