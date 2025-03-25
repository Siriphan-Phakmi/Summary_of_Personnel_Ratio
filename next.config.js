/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  basePath: '',
  // Add other supported configuration options here if needed
  webpack: (config) => {
    // ขยายขีดจำกัดขนาดของไฟล์ CSS
    const oneKb = 1024;
    config.performance = {
      ...config.performance,
      maxAssetSize: 300 * oneKb,
      maxEntrypointSize: 300 * oneKb,
    };
    return config;
  },
};

module.exports = nextConfig;
