"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";
import { useTenant } from "@/lib/tenant";
import { formatDate } from "@/lib/format";
import { SettingsRow, SettingsSection } from "@/components/SettingsSection";

type SessionUser = {
  email: string;
  name?: string | null;
  createdAt?: Date | string | null;
};

export default function AccountSettingsPage() {
  const router = useRouter();
  const { loaded, tenant } = useTenant();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [pending, setPending] = useState(true);

  useEffect(() => {
    let cancelled = false;
    void authClient.getSession().then(({ data }) => {
      if (cancelled) return;
      setUser((data?.user as SessionUser) ?? null);
      setPending(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const signOut = async () => {
    await authClient.signOut();
    router.replace("/sign-in");
    router.refresh();
  };

  return (
    <div className="flex flex-col gap-4">
      <SettingsSection
        title="Compte"
        description="L'identité utilisée pour te connecter. La connexion se fait par code e-mail ou par passkey — il n'y a pas de mot de passe à gérer."
      >
        <div className="flex flex-col">
          <SettingsRow label="E-mail">
            {pending ? "…" : (user?.email ?? "—")}
          </SettingsRow>
          <SettingsRow label="Nom">
            {pending ? "…" : (user?.name?.trim() || "—")}
          </SettingsRow>
          <SettingsRow label="Espace actif">
            {loaded ? (tenant?.name ?? "—") : "…"}
          </SettingsRow>
          {user?.createdAt && (
            <SettingsRow label="Membre depuis">
              {formatDate(user.createdAt)}
            </SettingsRow>
          )}
        </div>
      </SettingsSection>

      <SettingsSection
        title="Session"
        description="Ferme la session sur cet appareil. Tes passkeys restent valides."
      >
        <button
          type="button"
          onClick={() => void signOut()}
          className="touch-target rounded-pill border border-line px-4 text-[13px] font-semibold text-neg transition hover:brightness-110"
        >
          Se déconnecter
        </button>
      </SettingsSection>
    </div>
  );
}
