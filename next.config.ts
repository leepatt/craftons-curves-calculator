import { NextConfig } from 'next';

const nextConfig: NextConfig = {
  // Vercel deployment configuration - no static export needed
  images: {
    unoptimized: false, // Let Vercel handle image optimization
  },
  // Remove GitHub Pages specific configurations
  // Vercel works with root path by default
};

export default nextConfig;
