/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@packages/agents",
    "@packages/ai",
    "@packages/brain",
    "@packages/build-engine",
    "@packages/context",
    "@packages/contracts",
    "@packages/core-engine",
    "@packages/db",
    "@packages/memory",
    "@packages/observability",
    "@packages/registry",
    "@packages/sdk",
    "@packages/shared-services",
    "@packages/supabase",
    "@packages/templates",
    "@packages/tools",
    "@packages/ui",
    "@packages/utils",
    "@packages/validator",
    "@packages/auto-healer",
    "@packages/queue",
    "@packages/sandbox"
  ],
  experimental: {
    externalDir: true,
  },
  webpack: (config, { isServer }) => {
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        http2: false,
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
