import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Required headers for SharedArrayBuffer (FFmpeg.wasm)
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          {
            key: "Cross-Origin-Embedder-Policy",
            value: "require-corp",
          },
          {
            key: "Cross-Origin-Opener-Policy",
            value: "same-origin",
          },
        ],
      },
    ];
  },
  // Turbopack config (Next.js 16+ default bundler)
  turbopack: {},
};

export default nextConfig;
