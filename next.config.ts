import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactStrictMode: true,
  
  // Image optimization - disable for Netlify compatibility
  images: {
    unoptimized: true,
  },
  
  // Suppress punycode deprecation warning in development
  ...(process.env.NODE_ENV === 'development' && {
    webpack: (config: any) => {
      // Suppress punycode deprecation warning
      config.ignoreWarnings = [
        { module: /node_modules\/punycode/ },
        { message: /punycode/ }
      ];
      return config;
    },
  }),
  
  // Fix cross-origin warnings in development
  ...(process.env.NODE_ENV === 'development' && {
    allowedDevOrigins: [
      'localhost:3000',
      '127.0.0.1:3000',
      '10.100.102.18:3000', // Add your specific IP
      // Add other local network IPs as needed
    ],
  }),
  
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
        source: '/fonts/:path*',
        headers: [
          {
            key: 'Content-Type',
            value: 'font/otf',
          },
          {
            key: 'Cache-Control',
            value: 'public, max-age=31536000, immutable',
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
  
  async redirects() {
    return [
      // Handle missing apple-touch-icon requests
      {
        source: '/apple-touch-icon.png',
        destination: '/icons/touch-icon-iphone-retina.png',
        permanent: true,
      },
      {
        source: '/apple-touch-icon-precomposed.png',
        destination: '/icons/touch-icon-iphone-retina.png',
        permanent: true,
      },
      // Handle other common PWA icon requests
      {
        source: '/apple-touch-icon-:size.png',
        destination: '/icons/touch-icon-iphone-retina.png',
        permanent: true,
      },
    ]
  },
};

export default nextConfig;
