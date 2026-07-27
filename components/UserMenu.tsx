"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useImportCsvUi } from "@/lib/importCsvUi";
import { useTenant } from "@/lib/tenant";
import { useTheme } from "@/lib/theme";

type UserMenuProps = {
  onOpenGlossary: () => void;
  onAddAsset: () => void;
};

export function UserMenu({ onOpenGlossary, onAddAsset }: UserMenuProps) {
  const router = useRouter();
  const { theme, toggleTheme } = useTheme();
  const { openImportCsv } = useImportCsvUi();
  const { loaded, tenant, tenants, setActive } = useTenant();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [tenantBusy, setTenantBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const root = useRef<HTMLDivElement>(null);

  useEffect(() => {
    void authClient.getSession().then(({ data }) => {
      setEmail(data?.user.email ?? null);
    });
  }, []);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent | TouchEvent) => {
      if (!root.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("touchstart", onDoc);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("touchstart", onDoc);
    };
  }, [open]);

  const close = () => setOpen(false);

  const addPasskey = async () => {
    setBusy(true);
    setMsg(null);
    const { error } = await authClient.passkey.addPasskey({
      name: "Trade Brain",
    });
    setBusy(false);
    if (error) {
      setMsg(error.message || "Échec passkey");
      return;
    }
    setMsg("Passkey enregistrée.");
  };

  const signOut = async () => {
    await authClient.signOut();
    router.replace("/sign-in");
    router.refresh();
  };

  const switchTenant = async (id: string) => {
    if (!tenant || id === tenant.id || tenantBusy) return;
    setTenantBusy(true);
    await setActive(id);
    setTenantBusy(false);
    close();
    window.location.reload();
  };

  const initial = email?.[0]?.toUpperCase() ?? "?";
  const nextTheme = theme === "dark" ? "clair" : "sombre";

  return (
    <div ref={root} className="relative">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="touch-target grid place-items-center rounded-pill border border-line bg-card text-[13px] font-bold text-ink"
        aria-label="Compte"
        aria-expanded={open}
      >
        {initial}
      </button>
      {open && (
        <div className="absolute right-0 z-50 mt-2 max-h-[min(32rem,calc(100dvh-5rem))] w-[min(18.5rem,calc(100vw-1.5rem))] overflow-y-auto rounded-card border border-line bg-card p-3 shadow-soft">
          <p className="truncate px-1 text-[13px] font-semibold text-ink">
            {email ?? "…"}
          </p>
          {loaded && tenant && (
            <p className="mt-0.5 truncate px-1 text-[12px] text-ink3">
              {tenant.name}
            </p>
          )}

          <div className="mt-3 flex flex-col gap-1.5">
            <MenuButton
              onClick={() => {
                close();
                onAddAsset();
              }}
              emphasis
            >
              + Ajouter un actif
            </MenuButton>
            <MenuButton
              onClick={() => {
                close();
                openImportCsv();
              }}
            >
              Importer CSV
            </MenuButton>
            <MenuButton
              onClick={() => {
                close();
                onOpenGlossary();
              }}
            >
              Glossaire
            </MenuButton>
            <MenuButton
              onClick={() => {
                toggleTheme();
              }}
            >
              Thème {nextTheme}
            </MenuButton>
          </div>

          {loaded && tenant && tenants.length > 0 && (
            <div className="mt-3 border-t border-line pt-3">
              <p className="px-1 text-[11px] font-semibold uppercase tracking-wide text-ink3">
                Espaces
              </p>
              <ul className="mt-1.5 flex flex-col gap-0.5">
                {tenants.map((t) => {
                  const active = t.id === tenant.id;
                  return (
                    <li key={t.id}>
                      <button
                        type="button"
                        disabled={tenantBusy}
                        onClick={() => void switchTenant(t.id)}
                        className={`flex w-full items-center justify-between rounded-[10px] px-2.5 py-2 text-left text-[13px] font-semibold transition ${
                          active
                            ? "bg-chip text-ink"
                            : "text-ink2 hover:bg-chip hover:text-ink"
                        }`}
                      >
                        <span className="truncate">{t.name}</span>
                        {active && (
                          <span className="ml-2 text-[11px] text-accent">
                            actif
                          </span>
                        )}
                      </button>
                    </li>
                  );
                })}
              </ul>
              <Link
                href="/tenants"
                onClick={close}
                className="mt-1 block rounded-[10px] px-2.5 py-2 text-[12.5px] font-semibold text-ink2 hover:bg-chip hover:text-ink"
              >
                Gérer les espaces
              </Link>
            </div>
          )}

          <div className="mt-3 flex flex-col gap-1.5 border-t border-line pt-3">
            <MenuButton
              disabled={busy}
              onClick={() => void addPasskey()}
            >
              Ajouter une passkey
            </MenuButton>
            <MenuButton danger onClick={() => void signOut()}>
              Se déconnecter
            </MenuButton>
          </div>

          {msg && (
            <p className="mt-2 px-1 text-[12px] text-ink2">{msg}</p>
          )}
        </div>
      )}
    </div>
  );
}

function MenuButton({
  children,
  onClick,
  disabled,
  emphasis,
  danger,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  emphasis?: boolean;
  danger?: boolean;
}) {
  const tone = danger
    ? "border-line text-neg"
    : emphasis
      ? "border-transparent bg-accent text-onacc hover:brightness-110"
      : "border-line text-ink2 hover:text-ink";

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`touch-target rounded-pill border px-3 text-left text-[13px] font-semibold disabled:opacity-50 ${tone}`}
    >
      {children}
    </button>
  );
}
