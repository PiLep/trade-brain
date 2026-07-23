"use client";

import Link from "next/link";
import { authClient } from "@/lib/auth-client";

export default function ForbiddenPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <h1 className="text-[22px] font-bold tracking-tight text-ink">
        Accès non autorisé
      </h1>
      <p className="mt-2 max-w-sm text-[13.5px] text-ink2">
        Trade Brain est sur invitation. Ce compte n’est pas autorisé.
      </p>
      <button
        type="button"
        onClick={async () => {
          await authClient.signOut();
          window.location.href = "/sign-in";
        }}
        className="mt-6 rounded-pill bg-accent px-4 py-2.5 text-[13px] font-semibold text-onacc"
      >
        Se déconnecter
      </button>
      <Link
        href="/sign-in"
        className="mt-3 text-[12.5px] font-semibold text-ink2 underline"
      >
        Retour connexion
      </Link>
    </div>
  );
}
