import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  transpilePackages: [
    "@medi-bud/api-client",
    "@medi-bud/contracts",
    "@medi-bud/design-tokens",
    "@medi-bud/safety-content"
  ],
  async rewrites() {
    return [
      {
        source: "/api/v1/:path*",
        destination: "http://127.0.0.1:8000/v1/:path*",
      },
    ];
  },
};

export default nextConfig;
