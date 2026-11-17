import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-manrope",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Сховані",
  description: "Твори, яких зараз не видно — але їх можна побачити.",
  applicationName: "Сховані",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Сховані",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#110f0e",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="uk">
      <body className={`${manrope.variable} font-sans antialiased`}>
        <div id="app-shell">{children}</div>
      </body>
    </html>
  );
}
