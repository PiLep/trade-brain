/**
 * Trade Brain mark — "pas régulier".
 *
 * Three identical bars offset by one constant step: the repeated contribution,
 * plus an overall inclination. Deliberately not a curve and not an arrow — the
 * product orients a rhythm, it does not chase a price.
 *
 * Geometry is the 32×32 grid from the design handoff (piste 1d), kept exact so
 * the favicon in app/icon.tsx and this component stay the same shape.
 *
 * `fill="currentColor"` is intentional: the prototype set `color` on each
 * instance but left the rects unfilled, so they would have rendered black
 * whatever the theme. Inheriting the text colour is what it meant to do.
 */
export function Logo({
  size = 26,
  className,
  title,
}: {
  size?: number;
  className?: string;
  /** Set only when the mark stands alone; omit next to the wordmark. */
  title?: string;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      className={className}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      fill="currentColor"
    >
      <rect x="13" y="6" width="15" height="4.5" rx="1.6" />
      <rect x="8.5" y="13.75" width="15" height="4.5" rx="1.6" />
      <rect x="4" y="21.5" width="15" height="4.5" rx="1.6" />
    </svg>
  );
}
