import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@ecommers/types", "@ecommers/api-client", "@ecommers/ui"],
};

export default nextConfig;
