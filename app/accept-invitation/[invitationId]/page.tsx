"use client";

import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { authClient } from "@/lib/auth-client";

export default function AcceptInvitationPage() {
  const params = useParams<{ invitationId: string }>();
  const invitationId = params.invitationId;
  const router = useRouter();
  const { data: session, isPending } = authClient.useSession();
  const [status, setStatus] = useState<"idle" | "working" | "ok" | "error">(
    "idle",
  );
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isPending || !session?.user || !invitationId || status !== "idle") {
      return;
    }
    let cancelled = false;
    const run = async () => {
      setStatus("working");
      const { data, error } = await authClient.organization.acceptInvitation({
        invitationId,
      });
      if (cancelled) return;
      if (error) {
        setStatus("error");
        setMessage(error.message || "Invitation invalide ou expirée");
        return;
      }
      const orgId = data?.member?.organizationId;
      if (orgId) {
        await authClient.organization.setActive({ organizationId: orgId });
      }
      setStatus("ok");
      setMessage("Invitation acceptée. Redirection…");
      setTimeout(() => {
        router.replace("/tenants");
        router.refresh();
      }, 800);
    };
    void run();
    return () => {
      cancelled = true;
    };
  }, [isPending, session?.user, invitationId, status, router]);

  if (isPending) {
    return (
      <div className="mx-auto max-w-md px-4 py-16 text-center text-[14px] text-ink2">
        Vérification de la session…
      </div>
    );
  }

  if (!session?.user) {
    const next = `/accept-invitation/${invitationId}`;
    return (
      <div className="mx-auto max-w-md space-y-4 px-4 py-16 text-center">
        <h1 className="text-[22px] font-bold text-ink">Invitation</h1>
        <p className="text-[14px] text-ink2">
          Connecte-toi avec l’e-mail invité pour rejoindre l’espace.
        </p>
        <Link
          href={`/sign-in?next=${encodeURIComponent(next)}`}
          className="inline-flex rounded-pill bg-accent px-4 py-2.5 text-[13px] font-semibold text-onacc"
        >
          Se connecter
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md space-y-3 px-4 py-16 text-center">
      <h1 className="text-[22px] font-bold text-ink">Invitation</h1>
      <p className="text-[14px] text-ink2">
        {status === "working" && "Acceptation en cours…"}
        {status === "ok" && (message || "OK")}
        {status === "error" && (message || "Erreur")}
        {status === "idle" && "Préparation…"}
      </p>
      {status === "error" && (
        <Link
          href="/tenants"
          className="inline-flex rounded-pill border border-line px-4 py-2 text-[13px] font-semibold text-ink"
        >
          Voir mes espaces
        </Link>
      )}
    </div>
  );
}
