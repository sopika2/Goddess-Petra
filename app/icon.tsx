import { ImageResponse } from "next/og";

// Generated PNG favicon (more reliable than SVG for Google's search result icon
// and every browser). A hot-pink tile with a black "P".
export const size = { width: 96, height: 96 };
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
          background: "#ff2e88",
          color: "#0b0a0d",
          fontSize: 72,
          fontWeight: 900,
          borderRadius: 20,
        }}
      >
        P
      </div>
    ),
    { ...size },
  );
}
