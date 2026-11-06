import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  cacheComponents: true,
    cacheLife: {
    dashboard: {
      stale: 60,
      revalidate: 300,
      expire: 1800,
    },
  },

};

export default nextConfig;
