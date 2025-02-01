/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  distDir: 'out',
  trailingSlash: true,
}

module.exports = nextConfig
