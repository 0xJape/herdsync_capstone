import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "HerdSync",
    short_name: "HerdSync",
    description: "Livestock management for MSU-GenSan Animal Science Farm",
    start_url: "/dashboard",
    scope: "/",
    display: "standalone",
    display_override: ["fullscreen", "standalone"],
    background_color: "#f6f8f5",
    theme_color: "#1f7a4d",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}