import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

/**
 * Favicon: the same "pas régulier" mark as components/Logo.tsx, on the accent
 * rounded square.
 *
 * Expressed as positioned divs rather than inline SVG because this renders
 * through Satori, whose SVG support is partial — divs render identically every
 * time. Geometry is the design's 32×32 grid scaled to a 22×22 mark centred in
 * the 32×32 tile (factor 0.6875, offset 5), matching its favicon test.
 */
const SCALE = 22 / 32;
const OFFSET = 5;

const BARS = [
  { x: 13, y: 6 },
  { x: 8.5, y: 13.75 },
  { x: 4, y: 21.5 },
].map((b) => ({
  left: OFFSET + b.x * SCALE,
  top: OFFSET + b.y * SCALE,
  width: 15 * SCALE,
  height: 4.5 * SCALE,
  radius: 1.6 * SCALE,
}));

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          position: "relative",
          width: "100%",
          height: "100%",
          display: "flex",
          background: "#2F5BE7",
          borderRadius: 9,
        }}
      >
        {BARS.map((b, i) => (
          <div
            key={i}
            style={{
              position: "absolute",
              left: b.left,
              top: b.top,
              width: b.width,
              height: b.height,
              borderRadius: b.radius,
              background: "#ffffff",
            }}
          />
        ))}
      </div>
    ),
    { ...size },
  );
}
