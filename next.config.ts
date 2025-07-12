import { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Vercel deployment configuration - no static export needed
  images: {
    unoptimized: false, // Let Vercel handle image optimization
  },
  
  // Headers for iframe embedding support
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'ALLOWALL',
          },
          {
            key: 'Content-Security-Policy',
            value: "frame-ancestors 'self' https://*.shopify.com https://*.myshopify.com https://craftons.com.au *;",
          },
          {
            key: 'Access-Control-Allow-Origin',
            value: '*',
          },
          {
            key: 'Access-Control-Allow-Methods',
            value: 'GET, POST, PUT, DELETE, OPTIONS',
          },
          {
            key: 'Access-Control-Allow-Headers',
            value: 'Content-Type, Authorization',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
          // Fix for Vercel deployment protection in iframes
          {
            key: 'x-vercel-set-bypass-cookie',
            value: 'samesitenone',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
