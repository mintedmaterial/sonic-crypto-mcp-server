import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Enable static export for Cloudflare Pages
  output: 'export',

  // Disable image optimization for static export
  images: {
    unoptimized: true
  },

  // Configure trailing slashes
  trailingSlash: true,

  // Base path for subdirectory deployment if needed
  // basePath: '/dashboard',

  // Asset prefix for CDN
  // assetPrefix: '/dashboard',
};

export default nextConfig;
