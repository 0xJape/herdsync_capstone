import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import PwaInstall from "@/components/pwa-install";
import "./globals.css";

export const metadata: Metadata = {
  title: "HerdSync",
  description: "Livestock management for MSU-GenSan Animal Science Farm",
  applicationName: "HerdSync",
  manifest: "/manifest.webmanifest",
  appleWebApp: { capable: true, title: "HerdSync", statusBarStyle: "default" },
  icons: {
    icon: "/herdsync_logo.png",
    shortcut: "/herdsync_logo.png",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = { themeColor: "#1f7a4d" };

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      className="h-full antialiased"
    >
      <body className="min-h-full flex flex-col">{children}<PwaInstall /></body>
    </html>
  );
}
