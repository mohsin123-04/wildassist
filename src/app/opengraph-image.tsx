import { ImageResponse } from "next/og";

// Social share card (used for links shared to iMessage, Slack, social, etc.).
export const alt = "WildAssist: Found an injured animal?";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#ffffff",
          padding: "80px",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              display: "flex",
              width: "84px",
              height: "84px",
              borderRadius: "18px",
              background: "#059669",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <svg
              width="46"
              height="46"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#ffffff"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M16 7h.01" />
              <path d="M3.4 18H12a8 8 0 0 0 8-8V7a4 4 0 0 0-7.28-2.3L2 20" />
              <path d="m20 7 2 .5-2 .5" />
              <path d="M10 18v3" />
              <path d="M14 17.75V21" />
              <path d="M7 18a6 6 0 0 0 3.84-10.61" />
            </svg>
          </div>
          <div style={{ display: "flex", fontSize: "42px", fontWeight: 600, color: "#18181b" }}>
            WildAssist
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column" }}>
          <div
            style={{
              display: "flex",
              fontSize: "78px",
              fontWeight: 700,
              color: "#18181b",
              lineHeight: 1.05,
              letterSpacing: "-0.03em",
            }}
          >
            Found an injured animal?
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "34px",
              color: "#52525b",
              marginTop: "24px",
              maxWidth: "940px",
              lineHeight: 1.35,
            }}
          >
            Clear next steps, and the nearest help, wildlife centres, vets, and
            hotlines across the US &amp; Canada.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            borderTop: "2px solid #e4e4e7",
            paddingTop: "28px",
          }}
        >
          <div style={{ display: "flex", fontSize: "26px", color: "#71717a" }}>
            Free · No account needed
          </div>
          <div style={{ display: "flex", fontSize: "26px", color: "#059669", fontWeight: 600 }}>
            wildassist.vercel.app
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
