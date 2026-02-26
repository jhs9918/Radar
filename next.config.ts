import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdf-parse tries to load test files at import time, which breaks Next.js
  // bundling. Marking it as an external package lets Node.js require it
  // directly at runtime (Vercel Node.js runtime), bypassing the bundler.
  serverExternalPackages: ["pdf-parse"],
};

export default nextConfig;
