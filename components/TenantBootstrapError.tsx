"use client";

type Props = {
  error: string;
  onRetry: () => void;
};

export function TenantBootstrapError({ error, onRetry }: Props) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-start gap-4 py-16">
      <h1 className="text-[22px] font-bold tracking-tight text-ink">
        Espace indisponible
      </h1>
      <p className="text-[14px] leading-relaxed text-ink2">{error}</p>
      <button
        type="button"
        onClick={onRetry}
        className="touch-target inline-flex items-center rounded-pill bg-accent px-4 text-[13px] font-semibold text-onacc"
      >
        Réessayer
      </button>
    </div>
  );
}
