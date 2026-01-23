import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '500mb',
    },
  },
  // Allow large file uploads through middleware (500MB)
  // This is required for audio file uploads
  middlewareClientMaxBodySize: '500mb',
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
