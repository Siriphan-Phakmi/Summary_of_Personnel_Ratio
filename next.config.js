/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  poweredByHeader: false,
  typescript: {
    ignoreBuildErrors: true,
  },
  output: 'export',
  distDir: process.env.NODE_ENV === 'development' ? '.next' : 'C:/temp/nextjs-build',
  
  images: {
    unoptimized: true,
  },

  //  experimental features  ทำให้
  experimental: {
    optimizeCss: false, //  CSS optimization
    forceSwcTransforms: true,
    largePageDataBytes: 128 * 100000,
  },

  webpack: (config, { isServer }) => {
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          commons: {
            name: 'commons',
            chunks: 'all',
            minChunks: 2,
          },
        },
      },
    };
    return config;
  },
}

module.exports = nextConfig
