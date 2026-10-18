import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "o-auth 2.0 Simplified";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          backgroundColor: "#000000",
          color: "#ffffff",
          fontFamily: "Georgia, serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            width: 120,
            height: 120,
            borderRadius: "50%",
            border: "2px solid rgba(255,255,255,0.9)",
            marginBottom: 40,
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              width: 92,
              height: 92,
              borderRadius: "50%",
              border: "1px solid rgba(255,255,255,0.4)",
              fontSize: 52,
              fontWeight: 600,
            }}
          >
            o
          </div>
        </div>
        <div
          style={{
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: 56,
            fontWeight: 800,
            letterSpacing: "-0.02em",
          }}
        >
          o-auth 2.0 Simplified
        </div>
        <div
          style={{
            fontFamily: "Inter, system-ui, sans-serif",
            fontSize: 24,
            color: "rgba(255,255,255,0.55)",
            marginTop: 18,
          }}
        >
          Sponsored by Okhla
        </div>
      </div>
    ),
    { ...size }
  );
}
