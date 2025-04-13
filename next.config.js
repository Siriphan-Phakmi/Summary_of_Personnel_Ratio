/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  basePath: '',
  output: 'standalone',
  // เพิ่มการตั้งค่าเพื่อแก้ไข chunk error
  compiler: {
    // ลบคำเตือนที่ไม่จำเป็น
    styledComponents: true,
  },
  webpack: (config, { dev, isServer }) => {
    // ขยายขีดจำกัดขนาดของไฟล์
    const oneKb = 1024;
    
    // เพิ่มขนาด asset size ที่ยอมรับได้
    config.performance = {
      ...config.performance,
      maxAssetSize: 500 * oneKb,
      maxEntrypointSize: 500 * oneKb,
    };
    
    // ปรับแต่งการแบ่ง chunks
    config.optimization = {
      ...config.optimization,
      splitChunks: {
        chunks: 'all',
        cacheGroups: {
          default: false,
          vendors: false,
          // แยก chunk ของ React ออกมา
          framework: {
            name: 'framework',
            test: /[\\/]node_modules[\\/](react|react-dom|next)[\\/]/,
            priority: 40,
            chunks: 'all',
            enforce: true
          },
          // แยก chunk ของ Firebase ออกมา
          firebase: {
            name: 'firebase',
            test: /[\\/]node_modules[\\/](firebase|@firebase)[\\/]/,
            priority: 30,
            chunks: 'all'
          },
          // แยก libraries อื่นๆ
          lib: {
            test: /[\\/]node_modules[\\/]/,
            priority: 20,
            chunks: 'all'
          },
          // แยก styles
          styles: {
            name: 'styles',
            test: /\.(css|scss)$/,
            chunks: 'all',
            enforce: true
          }
        }
      },
      runtimeChunk: { name: 'runtime' }
    };
    
    return config;
  },
};

module.exports = nextConfig;
