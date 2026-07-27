"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ImportCsvUiProvider, useImportCsvUi } from "@/lib/importCsvUi";
import { MarketDataProvider } from "@/lib/marketData";
import { PortfolioProvider, usePortfolio } from "@/lib/storage";
import { ThemeProvider } from "@/lib/theme";
import { AddAssetDialog } from "@/components/AddAssetDialog";
import { BottomNav } from "@/components/BottomNav";
import { GlossaryDrawer } from "@/components/GlossaryDrawer";
import { ImportCsvDialog } from "@/components/ImportCsvDialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/UserMenu";

const NAV = [
  { href: "/dca", label: "DCA" },
  { href: "/", label: "Portefeuille" },
  { href: "/signals", label: "Signaux" },
  { href: "/journal", label: "Journal" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <PortfolioProvider>
        <MarketDataProvider>
          <ImportCsvUiProvider>
            <AppShellInner>{children}</AppShellInner>
          </ImportCsvUiProvider>
        </MarketDataProvider>
      </PortfolioProvider>
    </ThemeProvider>
  );
}

function AppShellInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { addHolding, replaceTradeRepublicImport } = usePortfolio();
  const { importOpen, setImportOpen, openImportCsv } = useImportCsvUi();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [glossOpen, setGlossOpen] = useState(false);

  const isBareRoute =
    pathname.startsWith("/sign-in") || pathname === "/forbidden";

  if (isBareRoute) {
    return <div className="min-h-dvh bg-bg text-ink">{children}</div>;
  }

  return (
    <div className="min-h-dvh bg-bg text-ink">
      <header className="sticky top-0 z-40 border-b border-line bg-[color-mix(in_srgb,var(--tb-bg)_88%,transparent)] pt-[env(safe-area-inset-top)] backdrop-blur-[14px]">
        <div className="mx-auto flex min-h-14 max-w-shell items-center gap-1.5 px-3 py-1.5 sm:gap-2.5 sm:px-5 lg:gap-3.5 lg:px-5 lg:py-2">
          <Link
            href="/dca"
            className="touch-target flex shrink-0 items-center gap-2 lg:gap-2.5"
          >
            <span className="grid h-8 w-8 place-items-center rounded-[9px] bg-accent text-[13px] font-bold text-onacc sm:h-[27px] sm:w-[27px]">
              T
            </span>
            <span className="hidden whitespace-nowrap text-[15px] font-bold tracking-tight text-ink sm:inline lg:text-[16.5px]">
              Trade Brain
            </span>
          </Link>

          {/* Desktop / large tablet: top nav */}
          <nav
            className="ml-1 hidden gap-0.5 overflow-x-auto rounded-pill bg-chip p-1 lg:flex lg:overflow-visible"
            aria-label="Navigation principale"
          >
            {NAV.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/" || pathname.startsWith("/asset/")
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`shrink-0 rounded-pill px-4 py-2 text-[13px] font-semibold transition ${
                    active
                      ? "bg-card text-ink shadow-soft"
                      : "bg-transparent text-ink2 hover:text-ink"
                  }`}
                >
                  {item.label}
                </Link>
              );
            })}
          </nav>

          <div className="ml-auto flex min-w-0 shrink items-center justify-end gap-1 overflow-x-auto [-ms-overflow-style:none] [scrollbar-width:none] sm:gap-2 lg:gap-2.5 [&::-webkit-scrollbar]:hidden">
            <button
              type="button"
              onClick={() => setGlossOpen(true)}
              className="touch-target hidden items-center justify-center whitespace-nowrap rounded-pill border border-line bg-card px-3.5 text-[13px] font-semibold text-ink2 hover:border-ink3 hover:text-ink sm:inline-flex"
            >
              Glossaire
            </button>
            <button
              type="button"
              onClick={() => setGlossOpen(true)}
              className="touch-target inline-flex shrink-0 items-center justify-center rounded-pill border border-line bg-card text-ink2 hover:border-ink3 hover:text-ink sm:hidden"
              aria-label="Glossaire"
              title="Glossaire"
            >
              <BookIcon />
            </button>
            <ThemeToggle />
            <button
              type="button"
              onClick={openImportCsv}
              className="touch-target inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-pill border border-line bg-card px-2.5 text-[12px] font-semibold text-ink hover:border-ink3 sm:px-3.5 sm:text-[13px]"
            >
              <span className="sm:hidden">CSV</span>
              <span className="hidden sm:inline">Importer CSV</span>
            </button>
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="touch-target inline-flex shrink-0 items-center justify-center whitespace-nowrap rounded-pill bg-accent px-3 text-[12px] font-semibold text-onacc hover:brightness-110 sm:px-4 sm:text-[13px]"
            >
              <span className="sm:hidden">+</span>
              <span className="hidden sm:inline">+ Ajouter un actif</span>
            </button>
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-shell px-4 pb-[calc(4.5rem+env(safe-area-inset-bottom))] pt-4 sm:px-5 sm:pt-6 lg:px-7 lg:pb-20 lg:pt-8">
        {children}
      </main>

      <BottomNav />

      <GlossaryDrawer open={glossOpen} onClose={() => setGlossOpen(false)} />

      <AddAssetDialog
        open={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onAdd={addHolding}
      />
      <ImportCsvDialog
        open={importOpen}
        onClose={() => setImportOpen(false)}
        onImport={(holdings, dcas, meta) =>
          replaceTradeRepublicImport(holdings, dcas, meta)
        }
      />
    </div>
  );
}

function BookIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" aria-hidden>
      <path
        d="M5 5.5A2.5 2.5 0 0 1 7.5 3H19v15.5H7.5A2.5 2.5 0 0 0 5 21"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M5 5.5V21"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
      <path
        d="M9 8h6M9 12h6"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}
