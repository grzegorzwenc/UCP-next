import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* The floating "N" dev indicator confuses reviewers on phones; errors still surface in the console. */
  devIndicators: false,
};

export default nextConfig;
