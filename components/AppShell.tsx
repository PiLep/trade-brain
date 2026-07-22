"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { PortfolioProvider, usePortfolio } from "@/lib/storage";
import { AddAssetDialog } from "@/components/AddAssetDialog";
import { ImportCsvDialog } from "@/components/ImportCsvDialog";
import { LearnRail } from "@/components/LearnRail";

const NAV = [
  { href: "/", label: "Portfolio" },
  { href: "/dca", label: "DCA" },
  { href: "/signals", label: "Signaux" },
  { href: "/journal", label: "Journal" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <PortfolioProvider>
      <AppShellInner>{children}</AppShellInner>
    </PortfolioProvider>
  );
}

function AppShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { addHolding, replaceTradeRepublicImport } = usePortfolio();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-hairline bg-plane/80 backdrop-blur">
        <div className="mx-auto flex max-w-[92rem] flex-wrap items-center justify-between gap-3 px-4 py-3 sm:px-6 xl:px-8">
          <div className="flex items-center gap-6">
            <Link
              href="/"
              className="text-lg font-semibold tracking-tight text-ink"
            >
              Trade Brain
            </Link>
            <nav className="flex items-center gap-1">
              {NAV.map((item) => {
                const active =
                  item.href === "/"
                    ? pathname === "/"
                    : pathname.startsWith(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`rounded-lg px-3 py-1.5 text-sm font-medium transition ${
                      active
                        ? "bg-surface-2 text-ink"
                        : "text-ink-muted hover:bg-surface hover:text-ink"
                    }`}
                  >
                    {item.label}
                  </Link>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setImportOpen(true)}
              className="rounded-lg border border-hairline bg-surface px-3 py-1.5 text-sm font-medium text-ink hover:bg-surface-2"
            >
              Import CSV
            </button>
            <button
              onClick={() => setDialogOpen(true)}
              className="rounded-lg bg-s-1 px-3 py-1.5 text-sm font-semibold text-white hover:brightness-110"
            >
              + Add asset
            </button>
          </div>
        </div>
      </header>

      <div className="mx-auto grid max-w-[92rem] gap-8 px-4 py-6 sm:px-6 xl:grid-cols-[minmax(0,1fr)_17.5rem] xl:px-8">
        <main className="min-w-0">{children}</main>
        <LearnRail />
      </div>

      <AddAssetDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onAdd={addHolding}
      />
      <ImportCsvDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={replaceTradeRepublicImport}
      />
    </div>
  );
}
