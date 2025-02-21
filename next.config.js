/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  output: 'export',
  distDir: '.next',
  
  // ย้าย serverComponentsExternalPackages ออกมาจาก experimental
  serverExternalPackages: ['@prisma/client'],

  images: {
    unoptimized: true,
  },

  webpack: (config, { isServer }) => {
    config.watchOptions = {
      poll: 1000,
      aggregateTimeout: 300,
      ignored: ['**/.git/**', '**/node_modules/**', '**/.next/**'],
    };
    config.node = {
      ...config.node,
      __filename: true,
      __dirname: true,
    };
    return config;
  },
  
  experimental: {
    forceSwcTransforms: true,
    largePageDataBytes: 128 * 100000,
    // ลบ appDir และ serverComponentsExternalPackages ออก
    optimizeCss: false,
    scrollRestoration: false,
  },
}

module.exports = nextConfig
