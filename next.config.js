/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  output: 'export',
  distDir: process.env.NODE_ENV === 'development' ? '.dev' : 'C:/temp/nextjs-build',
  
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
    optimizeCss: false,
    scrollRestoration: false,
  },

  // ย้ายมาไว้นอก experimental ตาม Next.js 15.1.6
  serverExternalPackages: ['@prisma/client'],
}

module.exports = nextConfig
