"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const SECTIONS = [
  { href: "/settings", label: "Compte" },
  { href: "/settings/security", label: "Sécurité" },
  { href: "/settings/spaces", label: "Espaces" },
  { href: "/settings/display", label: "Affichage" },
];

export default function SettingsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();

  return (
    <div className="animate-rise flex flex-col gap-5">
      <div>
        <h1 className="text-[22px] font-bold tracking-tight text-ink sm:text-[26px]">
          Réglages
        </h1>
        <p className="mt-1 text-[13px] text-ink2">
          Compte, sécurité, espaces et affichage.
        </p>
      </div>

      <nav
        className="flex gap-0.5 overflow-x-auto rounded-pill bg-chip p-1"
        aria-label="Sections des réglages"
      >
        {SECTIONS.map((s) => {
          // "/settings" is the account section, not a prefix for the others.
          const active =
            s.href === "/settings"
              ? pathname === "/settings"
              : pathname.startsWith(s.href);
          return (
            <Link
              key={s.href}
              href={s.href}
              aria-current={active ? "page" : undefined}
              className={`shrink-0 rounded-pill px-4 py-2 text-[13px] font-semibold transition ${
                active
                  ? "bg-card text-ink shadow-soft"
                  : "bg-transparent text-ink2 hover:text-ink"
              }`}
            >
              {s.label}
            </Link>
          );
        })}
      </nav>

      {children}
    </div>
  );
}
