import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Сховані",
    short_name: "Сховані",
    description:
      "Цифровий музей українського мистецтва, яке сьогодні не побачиш наживо.",
    start_url: "/",
    display: "standalone",
    background_color: "#110f0e",
    theme_color: "#110f0e",
    lang: "uk",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
