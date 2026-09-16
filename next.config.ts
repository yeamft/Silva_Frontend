import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  compress: true,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  experimental: {
    // Keep this list small — large lists slow webpack analysis on cold start.
    optimizePackageImports: ["lucide-react", "recharts", "date-fns"],
  },
  webpack: (config, { dev }) => {
    if (dev) {
      // Default chunk load timeout (~3s) fires while cold compiles take 15–40s.
      config.output = {
        ...config.output,
        chunkLoadTimeout: 120_000,
      };
    }
    return config;
  },
  async redirects() {
    return [
      { source: "/rate-card", destination: "/cropfort/rate-card", permanent: false },
      { source: "/admin", destination: "/cropfort/admin/farm-map", permanent: false },
      { source: "/admin/users", destination: "/cropfort/users", permanent: false },
      { source: "/admin/organizations", destination: "/cropfort/admin/organizations", permanent: false },
      { source: "/admin/farm-areas", destination: "/cropfort/admin/farm-areas", permanent: false },
      { source: "/admin/vendors", destination: "/cropfort/admin/vendors", permanent: false },
      { source: "/admin/asset-owners", destination: "/cropfort/admin/asset-owners", permanent: false },
      { source: "/admin/farm-map", destination: "/cropfort/admin/farm-map", permanent: false },
    ];
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
};

export default nextConfig;
