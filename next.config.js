/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { isServer }) => {
    if (isServer) {
      // Prevent canvas from being required on the server
      config.externals = [...(config.externals || []), 'canvas']
    } else {
      // Fabric.jsをクライアントサイドでのみ使用
      config.resolve.fallback = {
        ...config.resolve.fallback,
        canvas: false,
        encoding: false,
      }
    }
    return config
  },
}

module.exports = nextConfig
