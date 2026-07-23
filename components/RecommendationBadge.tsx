import type { Recommendation } from "@/lib/types";

const STYLES: Record<
  Recommendation,
  { label: string; className: string }
> = {
  STRONG_BUY: {
    label: "▲▲ Strong Buy",
    className: "text-pos bg-[color-mix(in_srgb,var(--tb-pos)_12%,transparent)]",
  },
  BUY: {
    label: "▲ Buy",
    className: "text-pos bg-[color-mix(in_srgb,var(--tb-pos)_12%,transparent)]",
  },
  HOLD: {
    label: "— Hold",
    className: "text-ink2 bg-chip",
  },
  SELL: {
    label: "▼ Sell",
    className: "text-neg bg-[color-mix(in_srgb,var(--tb-neg)_12%,transparent)]",
  },
  STRONG_SELL: {
    label: "▼▼ Strong Sell",
    className: "text-neg bg-[color-mix(in_srgb,var(--tb-neg)_12%,transparent)]",
  },
};

export function RecommendationBadge({
  recommendation,
  size = "md",
  unmanaged,
}: {
  recommendation?: Recommendation | null;
  size?: "sm" | "md" | "lg";
  unmanaged?: boolean;
}) {
  if (unmanaged || !recommendation) {
    return (
      <span className="inline-flex items-center whitespace-nowrap rounded-pill border border-line px-2.5 py-1 text-[11.5px] font-bold text-ink3">
        Non géré
      </span>
    );
  }

  const s = STYLES[recommendation];
  const sizing =
    size === "lg"
      ? "text-sm px-3 py-1.5"
      : size === "sm"
        ? "text-[11.5px] px-2.5 py-1"
        : "text-[11.5px] px-2.5 py-1";

  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-pill font-bold ${s.className} ${sizing}`}
    >
      {s.label}
    </span>
  );
}
