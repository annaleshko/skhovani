import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export const alt = "Сховані";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

const TITLE = "Сховані";
const DESCRIPTION =
  "Цифровий музей українського мистецтва, яке сьогодні не побачиш наживо.";

export default async function OpenGraphImage() {
  const iconBytes = await readFile(
    join(process.cwd(), "public/icons/icon-512.png"),
  );
  const iconSrc = `data:image/png;base64,${iconBytes.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "row",
          alignItems: "center",
          padding: "72px 80px",
          gap: 64,
          background: "#110f0e",
          color: "#f5efe6",
        }}
      >
        <img
          src={iconSrc}
          width={260}
          height={260}
          alt=""
          style={{
            width: 260,
            height: 260,
            borderRadius: 56,
            flexShrink: 0,
          }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            justifyContent: "center",
            flex: 1,
            minWidth: 0,
          }}
        >
          <div
            style={{
              display: "flex",
              fontSize: 88,
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
              marginTop: 24,
              fontSize: 32,
              fontWeight: 500,
              lineHeight: 1.35,
              color: "#c9c0b4",
            }}
          >
            {DESCRIPTION}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
