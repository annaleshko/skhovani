import { DesktopPreviewGate } from "@/components/preview/DesktopPreviewGate";
import { Providers } from "@/components/providers/Providers";
import type { Metadata, Viewport } from "next";
import { Manrope } from "next/font/google";
import "./globals.css";

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-manrope",
  display: "swap",
});

const SITE_TITLE = "Сховані";
const SITE_DESCRIPTION =
  "Цифровий музей українського мистецтва, яке сьогодні не побачиш наживо.";

export const metadata: Metadata = {
  metadataBase: new URL("https://web-eta-tawny-94.vercel.app"),
  title: SITE_TITLE,
  description: SITE_DESCRIPTION,
  applicationName: SITE_TITLE,
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: SITE_TITLE,
  },
  formatDetection: { telephone: false },
  openGraph: {
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
    url: "/",
    siteName: SITE_TITLE,
    locale: "uk_UA",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: SITE_TITLE,
    description: SITE_DESCRIPTION,
  },
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
    <html lang="uk" className="bg-screen">
      <body
        className={`${manrope.variable} bg-screen font-sans antialiased`}
        suppressHydrationWarning
      >
        <Providers>
          <DesktopPreviewGate>{children}</DesktopPreviewGate>
        </Providers>
      </body>
    </html>
  );
}
