import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb',
    },
    // Allow large file uploads (500MB) for audio processing
    proxyClientMaxBodySize: 500 * 1024 * 1024, // 500MB in bytes
  },
  images: {
    domains: ['startmybusiness.us', 'cdn.prod.website-files.com'],
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'cdn.prod.website-files.com',
        pathname: '/**',
      },
    ],
  },
};

export default nextConfig;
