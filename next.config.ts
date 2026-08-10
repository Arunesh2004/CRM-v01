import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Removed output: 'standalone' to fix Vercel onBuildComplete hook compatibility
};

export default nextConfig;
