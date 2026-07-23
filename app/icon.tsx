import { ImageResponse } from "next/og";

export const size = { width: 32, height: 32 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#2F5BE7",
          borderRadius: 9,
          color: "#fff",
          fontSize: 16,
          fontWeight: 700,
          fontFamily: "system-ui, sans-serif",
        }}
      >
        T
      </div>
    ),
    { ...size },
  );
}
