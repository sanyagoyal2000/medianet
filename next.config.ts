import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
