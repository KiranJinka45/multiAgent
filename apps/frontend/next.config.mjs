/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@libs/agents",
    "@libs/ai",
    "@libs/brain",
    "@libs/build-engine",
    "@libs/context",
    "@libs/contracts",
    "@libs/core-engine",
    "@libs/db",
    "@libs/memory",
    "@libs/observability",
    "@libs/registry",
    "@libs/sdk",
    "@libs/shared-services",
    "@libs/supabase",
    "@libs/templates",
    "@libs/tools",
    "@libs/ui",
    "@libs/utils",
    "@libs/validator"
  ],
  experimental: {
    externalDir: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        child_process: false,
        readline: false,
        worker_threads: false,
        async_hooks: false,
        perf_hooks: false,
        dns: false,
      };
    }
    config.externals = [...(config.externals || []), 'ssh2', 'cpu-features', 'nan'];
    return config;
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
};

export default nextConfig;
