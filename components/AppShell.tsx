"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ImportCsvUiProvider, useImportCsvUi } from "@/lib/importCsvUi";
import { MarketDataProvider } from "@/lib/marketData";
import { PortfolioProvider, usePortfolio } from "@/lib/storage";
import { TenantProvider } from "@/lib/tenant";
import { ThemeProvider } from "@/lib/theme";
import { AddAssetDialog } from "@/components/AddAssetDialog";
import { GlossaryDrawer } from "@/components/GlossaryDrawer";
import { ImportCsvDialog } from "@/components/ImportCsvDialog";
import { TenantSwitcher } from "@/components/TenantSwitcher";
import { ThemeToggle } from "@/components/ThemeToggle";
import { UserMenu } from "@/components/UserMenu";

const NAV = [
  { href: "/dca", label: "DCA" },
  { href: "/", label: "Portefeuille" },
  { href: "/signals", label: "Signaux" },
  { href: "/journal", label: "Journal" },
  { href: "/tenants", label: "Espaces" },
];

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider>
      <TenantProvider>
        <PortfolioProvider>
          <MarketDataProvider>
            <ImportCsvUiProvider>
              <AppShellInner>{children}</AppShellInner>
            </ImportCsvUiProvider>
          </MarketDataProvider>
        </PortfolioProvider>
      </TenantProvider>
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
    pathname.startsWith("/sign-in") ||
    pathname === "/forbidden" ||
    pathname.startsWith("/accept-invitation/");

  if (isBareRoute) {
    return <div className="min-h-screen bg-bg text-ink">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-bg text-ink">
      <header className="sticky top-0 z-40 border-b border-line bg-[color-mix(in_srgb,var(--tb-bg)_85%,transparent)] pt-[env(safe-area-inset-top)] backdrop-blur-[14px]">
        <div className="mx-auto flex min-h-12 max-w-shell flex-wrap items-center gap-x-2.5 gap-y-2 px-4 py-2 sm:px-5 lg:gap-3.5 lg:px-5">
          <Link href="/dca" className="flex shrink-0 items-center gap-2 lg:gap-2.5">
            <span className="grid h-[27px] w-[27px] place-items-center rounded-[9px] bg-accent text-[13px] font-bold text-onacc">
              T
            </span>
            <span className="whitespace-nowrap text-[15px] font-bold tracking-tight text-ink lg:text-[16.5px]">
              Trade Brain
            </span>
          </Link>

          <nav className="order-3 flex w-full gap-0.5 overflow-x-auto rounded-pill bg-chip p-1 [-ms-overflow-style:none] [scrollbar-width:none] lg:order-none lg:w-auto lg:overflow-visible [&::-webkit-scrollbar]:hidden">
            {NAV.map((item) => {
              const active =
                item.href === "/"
                  ? pathname === "/"
                  : pathname.startsWith(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`shrink-0 rounded-pill px-3.5 py-[7px] text-[13px] font-semibold transition lg:px-4 ${
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

          <div className="ml-auto flex flex-wrap items-center justify-end gap-1.5 sm:gap-2 lg:gap-2.5">
            <TenantSwitcher />
            <button
              type="button"
              onClick={() => setGlossOpen(true)}
              className="whitespace-nowrap rounded-pill border border-line bg-card px-2.5 py-1.5 text-[12px] font-semibold text-ink2 hover:border-ink3 hover:text-ink sm:px-3.5 sm:py-2 sm:text-[13px]"
            >
              Glossaire
            </button>
            <ThemeToggle />
            <button
              type="button"
              onClick={openImportCsv}
              className="whitespace-nowrap rounded-pill border border-line bg-card px-2.5 py-1.5 text-[12px] font-semibold text-ink hover:border-ink3 sm:px-3.5 sm:py-2 sm:text-[13px]"
            >
              <span className="sm:hidden">CSV</span>
              <span className="hidden sm:inline">Importer CSV</span>
            </button>
            <button
              type="button"
              onClick={() => setDialogOpen(true)}
              className="whitespace-nowrap rounded-pill bg-accent px-3 py-[7px] text-[12px] font-semibold text-onacc hover:brightness-110 sm:px-4 sm:py-[9px] sm:text-[13px]"
            >
              <span className="sm:hidden">+ Actif</span>
              <span className="hidden sm:inline">+ Ajouter un actif</span>
            </button>
            <UserMenu />
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-shell px-4 pb-[max(5rem,env(safe-area-inset-bottom))] pt-5 sm:px-5 sm:pt-6 lg:px-7 lg:pb-20 lg:pt-8">
        {children}
      </main>

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
