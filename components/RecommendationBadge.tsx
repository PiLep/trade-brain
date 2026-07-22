import type { Recommendation } from "@/lib/types";
import { RECOMMENDATION_LABEL } from "@/lib/advice";

// Status colors carry an icon + label so meaning is never color-alone.
const STYLES: Record<
  Recommendation,
  { fg: string; bg: string; ring: string; icon: string }
> = {
  STRONG_BUY: {
    fg: "text-good",
    bg: "bg-good/15",
    ring: "ring-good/40",
    icon: "▲▲",
  },
  BUY: { fg: "text-good", bg: "bg-good/10", ring: "ring-good/30", icon: "▲" },
  HOLD: {
    fg: "text-warning",
    bg: "bg-warning/10",
    ring: "ring-warning/30",
    icon: "◆",
  },
  SELL: {
    fg: "text-critical",
    bg: "bg-critical/10",
    ring: "ring-critical/30",
    icon: "▼",
  },
  STRONG_SELL: {
    fg: "text-critical",
    bg: "bg-critical/15",
    ring: "ring-critical/40",
    icon: "▼▼",
  },
};

export function RecommendationBadge({
  recommendation,
  size = "md",
}: {
  recommendation: Recommendation;
  size?: "sm" | "md" | "lg";
}) {
  const s = STYLES[recommendation];
  const sizing =
    size === "lg"
      ? "text-sm px-3 py-1.5"
      : size === "sm"
        ? "text-[11px] px-2 py-0.5"
        : "text-xs px-2.5 py-1";
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ${s.fg} ${s.bg} ${s.ring} ${sizing}`}
    >
      <span aria-hidden className="text-[0.7em] leading-none tracking-tighter">
        {s.icon}
      </span>
      {RECOMMENDATION_LABEL[recommendation]}
    </span>
  );
}
