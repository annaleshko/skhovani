import { ImageResponse } from "next/og";

export const alt = "Сховані";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TITLE = "Сховані";
const DESCRIPTION =
  "Цифровий музей українського мистецтва, яке сьогодні не побачиш наживо.";

export default function OpenGraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "center",
          padding: "72px 80px",
          background: "#110f0e",
          color: "#f5efe6",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 96,
            fontWeight: 700,
            letterSpacing: "-0.02em",
            lineHeight: 1.05,
            color: "#e9b872",
          }}
        >
          {TITLE}
        </div>
        <div
          style={{
            display: "flex",
            marginTop: 28,
            maxWidth: 920,
            fontSize: 36,
            fontWeight: 500,
            lineHeight: 1.35,
            color: "#c9c0b4",
          }}
        >
          {DESCRIPTION}
        </div>
      </div>
    ),
    { ...size },
  );
}
