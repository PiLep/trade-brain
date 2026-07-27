"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  {
    href: "/dca",
    label: "DCA",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M4 19V5M4 19h16"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
        <path
          d="M8 15v-3M12 15V9M16 15v-6"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    href: "/",
    label: "Portefeuille",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <rect
          x="3"
          y="7"
          width="18"
          height="13"
          rx="2.5"
          stroke="currentColor"
          strokeWidth="1.75"
        />
        <path
          d="M3 11h18M8 7V5.5A1.5 1.5 0 0 1 9.5 4h5A1.5 1.5 0 0 1 16 5.5V7"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
  {
    href: "/signals",
    label: "Signaux",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M4 14l4-4 3.5 3.5L20 5"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <path
          d="M15 5h5v5"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    ),
  },
  {
    href: "/journal",
    label: "Journal",
    icon: (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" aria-hidden>
        <path
          d="M7 3.75h9.5A2.75 2.75 0 0 1 19.25 6.5v13A1.75 1.75 0 0 1 17.5 21.25H7A2.25 2.25 0 0 1 4.75 19V6A2.25 2.25 0 0 1 7 3.75z"
          stroke="currentColor"
          strokeWidth="1.75"
        />
        <path
          d="M8.5 8.5h7M8.5 12h7M8.5 15.5h4.5"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinecap="round"
        />
      </svg>
    ),
  },
] as const;

export function BottomNav() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-[color-mix(in_srgb,var(--tb-bg)_92%,transparent)] pb-[env(safe-area-inset-bottom)] backdrop-blur-[14px] lg:hidden"
      aria-label="Navigation principale"
    >
      <ul className="mx-auto grid max-w-shell grid-cols-4">
        {NAV.map((item) => {
          const active =
            item.href === "/"
              ? pathname === "/" || pathname.startsWith("/asset/")
              : pathname.startsWith(item.href);
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                className={`touch-target flex min-h-14 flex-col items-center justify-center gap-0.5 px-1 text-[11px] font-semibold tracking-tight transition ${
                  active ? "text-accent" : "text-ink3 active:text-ink2"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <span
                  className={`grid h-7 w-7 place-items-center rounded-lg ${
                    active
                      ? "bg-[color-mix(in_srgb,var(--tb-accent)_14%,transparent)]"
                      : ""
                  }`}
                >
                  {item.icon}
                </span>
                <span className="leading-none">{item.label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
