import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@ecommers/types", "@ecommers/api-client", "@ecommers/ui"],
  devIndicators: false,
};

export default nextConfig;
