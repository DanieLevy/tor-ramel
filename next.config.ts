import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  async headers() {
    return [
      {
        source: '/sw.js',
        headers: [
          {
            key: 'Service-Worker-Allowed',
            value: '/',
          },
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
      {
        source: '/manifest.json',
        headers: [
          {
            key: 'Content-Type',
            value: 'application/manifest+json',
          },
        ],
      },
    ]
  },
  async rewrites() {
    return {
      beforeFiles: [
        // Prevent Next.js from handling Netlify function URLs
        {
          source: '/.netlify/functions/:path*',
          destination: '/.netlify/functions/:path*',
        },
      ],
    }
  },
};

export default nextConfig;
