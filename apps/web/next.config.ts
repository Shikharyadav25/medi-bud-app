import type { NextConfig } from "next";
import { publicConfig } from "./src/lib/publicConfig";

const nextConfig: NextConfig = {
  distDir: process.env.NEXT_DIST_DIR || ".next",
  reactStrictMode: true,
  poweredByHeader: false,
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "X-Frame-Options", value: "DENY" },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(self), geolocation=(self)",
          },
          {
            key: "Content-Security-Policy",
            value:
              "default-src 'self'; script-src 'self' 'unsafe-inline'" +
              (process.env.NODE_ENV === "development" ? " 'unsafe-eval'" : "") +
              "; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; font-src 'self'; connect-src 'self' " +
              (publicConfig.authConfigured
                ? publicConfig.supabaseUrl + " "
                : "") +
              (publicConfig.apiConfigured ||
              process.env.NODE_ENV === "development"
                ? publicConfig.apiBaseUrl
                : "") +
              (process.env.NODE_ENV === "development"
                ? " ws: http://localhost:8000"
                : "") +
              "; frame-ancestors 'none'; object-src 'none'; base-uri 'self'; form-action 'self'",
          },
        ],
      },
    ];
  },
  transpilePackages: [
    "@medi-bud/api-client",
    "@medi-bud/contracts",
    "@medi-bud/design-tokens",
    "@medi-bud/safety-content",
  ],
  async rewrites() {
    const api =
      publicConfig.apiConfigured || process.env.NODE_ENV === "development"
        ? publicConfig.apiBaseUrl
        : "";
    return {
      beforeFiles: api
        ? [
            {
              source: "/api/v1/:path*",
              destination: `${api.replace(/\/$/, "")}/v1/:path*`,
            },
          ]
        : [],
    };
  },
};

export default nextConfig;
