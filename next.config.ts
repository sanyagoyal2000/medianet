import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Local build checks can use a separate dir so they don't clobber `next dev` (NEXT_DIST_DIR=.next-build).
  distDir: process.env.NEXT_DIST_DIR || ".next",
  // Prompts live as Markdown and are bundled as strings (no fs reads at runtime on Vercel).
  webpack(config) {
    config.module.rules.push({ test: /\.md$/, type: "asset/source" });
    return config;
  },
  serverExternalPackages: ["linkedom"],
  devIndicators: false,
  outputFileTracingRoot: __dirname,
};

export default nextConfig;
