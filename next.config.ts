import { NextConfig } from 'next';

const nextConfig: NextConfig = {
  output: 'export',
  trailingSlash: true,
  images: {
    unoptimized: true,
  },
  // Add base path for GitHub Pages
  basePath: '/craftons-curves-calculator',
  assetPrefix: '/craftons-curves-calculator/',
};

export default nextConfig;
