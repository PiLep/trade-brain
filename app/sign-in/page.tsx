"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";
import { authClient } from "@/lib/auth-client";

type Step = "email" | "otp";

function SignInForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/dca";

  const [step, setStep] = useState<Step>("email");
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const sendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    const { error: err } = await authClient.emailOtp.sendVerificationOtp({
      email: email.trim().toLowerCase(),
      type: "sign-in",
    });
    setBusy(false);
    if (err) {
      setError(
        err.message?.includes("Invitation") || err.status === 403
          ? "Cette adresse n’est pas invitée."
          : err.message || "Envoi impossible",
      );
      return;
    }
    setInfo("Code envoyé — vérifie ta boîte mail (ou les logs serveur en local).");
    setStep("otp");
  };

  const verifyCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const { error: err } = await authClient.signIn.emailOtp({
      email: email.trim().toLowerCase(),
      otp: otp.trim(),
    });
    setBusy(false);
    if (err) {
      setError(err.message || "Code invalide");
      return;
    }
    router.replace(next);
    router.refresh();
  };

  const signInPasskey = async () => {
    setBusy(true);
    setError(null);
    const { error: err } = await authClient.signIn.passkey({
      autoFill: false,
    });
    setBusy(false);
    if (err) {
      setError(err.message || "Passkey refusée");
      return;
    }
    router.replace(next);
    router.refresh();
  };

  return (
    <div className="w-full max-w-[400px]">
      <button
        type="button"
        onClick={() => void signInPasskey()}
        disabled={busy}
        className="mb-4 min-h-12 w-full rounded-pill border border-line bg-card px-4 py-3 text-[14px] font-semibold text-ink hover:border-ink3 disabled:opacity-50"
      >
        Continuer avec une passkey
      </button>

      <div className="relative mb-4 text-center text-[11px] uppercase tracking-[0.08em] text-ink3">
        <span className="bg-bg px-2">ou code email</span>
        <div className="absolute inset-x-0 top-1/2 -z-10 border-t border-line" />
      </div>

      {step === "email" ? (
        <form onSubmit={sendCode} className="space-y-3">
          <label className="block text-[13px] font-medium text-ink2">
            Email invité
            <input
              type="email"
              required
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1.5 min-h-12 w-full rounded-xl border border-line bg-card px-3.5 py-3 text-base text-ink outline-none focus:border-accent sm:text-[14px]"
              placeholder="toi@exemple.com"
            />
          </label>
          <button
            type="submit"
            disabled={busy || !email.trim()}
            className="min-h-12 w-full rounded-pill bg-accent px-4 py-3 text-[14px] font-semibold text-onacc disabled:opacity-50"
          >
            {busy ? "Envoi…" : "Recevoir un code"}
          </button>
        </form>
      ) : (
        <form onSubmit={verifyCode} className="space-y-3">
          <p className="text-[13px] text-ink2">
            Code envoyé à <strong className="text-ink">{email}</strong>
          </p>
          <label className="block text-[13px] font-medium text-ink2">
            Code à 6 chiffres
            <input
              type="text"
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              maxLength={8}
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              className="mt-1.5 min-h-12 w-full rounded-xl border border-line bg-card px-3.5 py-3 text-center font-mono text-[18px] tracking-[0.2em] text-ink outline-none focus:border-accent"
              placeholder="••••••"
            />
          </label>
          <button
            type="submit"
            disabled={busy || otp.trim().length < 6}
            className="min-h-12 w-full rounded-pill bg-accent px-4 py-3 text-[14px] font-semibold text-onacc disabled:opacity-50"
          >
            {busy ? "Vérification…" : "Se connecter"}
          </button>
          <button
            type="button"
            onClick={() => {
              setStep("email");
              setOtp("");
              setError(null);
            }}
            className="touch-target w-full text-[13px] font-semibold text-ink2 underline"
          >
            Changer d’email
          </button>
        </form>
      )}

      {error && (
        <p className="mt-3 rounded-xl bg-[color-mix(in_srgb,var(--tb-neg)_10%,transparent)] px-3 py-2 text-[13px] text-neg">
          {error}
        </p>
      )}
      {info && !error && (
        <p className="mt-3 text-[12.5px] text-ink2">{info}</p>
      )}
    </div>
  );
}

export default function SignInPage() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-10">
      <div className="mb-8 text-center">
        <div className="mx-auto mb-3 grid h-10 w-10 place-items-center rounded-[11px] bg-accent text-base font-bold text-onacc">
          T
        </div>
        <h1 className="text-[22px] font-bold tracking-tight text-ink">
          Trade Brain
        </h1>
        <p className="mt-1 text-[13.5px] text-ink2">
          Accès sur invitation · code email ou passkey
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-ink3">Chargement…</p>}>
        <SignInForm />
      </Suspense>
    </div>
  );
}
