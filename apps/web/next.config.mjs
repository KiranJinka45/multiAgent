/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@services",
    "@queue",
    "@config",
    "@agents",
    "@shared",
    "@libs",
    "@registry"
  ],
  experimental: {
    externalDir: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
