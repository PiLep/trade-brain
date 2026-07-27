"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";

export function UserMenu() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
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

  const initial = email?.[0]?.toUpperCase() ?? "?";

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
        <div className="absolute right-0 z-50 mt-2 w-[min(18rem,calc(100vw-1.5rem))] rounded-card border border-line bg-card p-3 shadow-soft">
          <p className="truncate px-1 text-[13px] font-semibold text-ink">
            {email ?? "…"}
          </p>
          <div className="mt-3 flex flex-col gap-2">
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                router.push("/tenants");
              }}
              className="rounded-pill border border-line px-3 py-1.5 text-left text-[12.5px] font-semibold text-ink2 hover:text-ink"
            >
              Gérer les espaces
            </button>
            <button
              type="button"
              disabled={busy}
              onClick={() => void addPasskey()}
              className="touch-target rounded-pill border border-line px-3 text-left text-[13px] font-semibold text-ink2 hover:text-ink disabled:opacity-50"
            >
              Ajouter une passkey
            </button>
            <button
              type="button"
              onClick={() => void signOut()}
              className="touch-target rounded-pill border border-line px-3 text-left text-[13px] font-semibold text-neg"
            >
              Se déconnecter
            </button>
          </div>
          {msg && (
            <p className="mt-2 px-1 text-[12px] text-ink2">{msg}</p>
          )}
        </div>
      )}
    </div>
  );
}
