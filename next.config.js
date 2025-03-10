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
  
  // เพิ่ม redirects สำหรับเส้นทางเก่าไปยังเส้นทางใหม่
  async redirects() {
    return [
      {
        source: '/ward-form',
        destination: '/page/ward-form',
        permanent: true,
      },
      {
        source: '/login',
        destination: '/page/login',
        permanent: true,
      },
      {
        source: '/dashboard',
        destination: '/page/dashboard',
        permanent: true,
      },
      {
        source: '/approval',
        destination: '/page/approval',
        permanent: true,
      },
      {
        source: '/admin/user-management',
        destination: '/page/user-management',
        permanent: true,
      }
    ]
  },
};

module.exports = nextConfig;
