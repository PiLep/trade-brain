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
import { BottomNav } from "@/components/BottomNav";
import { GlossaryDrawer } from "@/components/GlossaryDrawer";
import { ImportCsvDialog } from "@/components/ImportCsvDialog";
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
  const { importOpen, setImportOpen } = useImportCsvUi();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [glossOpen, setGlossOpen] = useState(false);

  const isBareRoute =
    pathname.startsWith("/sign-in") ||
    pathname === "/forbidden" ||
    pathname.startsWith("/accept-invitation/");

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

          <div className="ml-auto flex shrink-0 items-center justify-end">
            <UserMenu
              onOpenGlossary={() => setGlossOpen(true)}
              onAddAsset={() => setDialogOpen(true)}
            />
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
