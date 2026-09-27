import path from "node:path";
import type { NextConfig } from "next";

const scriptSrc = process.env.NODE_ENV === "production"
  ? "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'"
  : "script-src 'self' 'unsafe-inline' 'unsafe-eval'";

const nextConfig: NextConfig = {
  allowedDevOrigins: ["192.168.1.61", "herdsync.dotenvlabs.me"],
  poweredByHeader: false,
  async headers() {
    return [{
      source: "/(.*)",
      headers: [
        { key: "Content-Security-Policy", value: `default-src 'self'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; object-src 'none'; img-src 'self' data: blob: https://images.unsplash.com; font-src 'self' data: https://fonts.gstatic.com; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; ${scriptSrc}; connect-src 'self' blob:; worker-src 'self' blob:; upgrade-insecure-requests` },
        { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
        { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        { key: "X-Content-Type-Options", value: "nosniff" },
        { key: "X-Frame-Options", value: "DENY" },
        { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
      ],
    }, {
      source: "/sw.js",
      headers: [
        { key: "Content-Type", value: "application/javascript; charset=utf-8" },
        { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
      ],
    }];
  },
  turbopack: { root: path.resolve(__dirname) },
};

export default nextConfig;
