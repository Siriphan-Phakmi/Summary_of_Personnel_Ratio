/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  distDir: process.env.NODE_ENV === 'development' ? '.next' : 'dist',
  
  images: {
    unoptimized: true,
  },

  experimental: {
    optimizeCss: false,
    forceSwcTransforms: true,
    largePageDataBytes: 128 * 100000,
  },
};

module.exports = nextConfig;
