import path from "path";
/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    externalDir: true,
    serverComponentsExternalPackages: ["cpu-features"],
  },

  transpilePackages: [
    "@packages/utils",
    "@packages/context",
    "@packages/shared-services",
    "@packages/db",
    "@packages/observability",
    "@packages/agents",
    "@packages/ai",
    "@packages/brain",
    "@packages/build-engine",
    "@packages/contracts",
    "@packages/core-engine",
    "@packages/memory",
    "@packages/registry",
    "@packages/sdk",
    "@packages/supabase",
    "@packages/templates",
    "@packages/tools",
    "@packages/ui",
    "@packages/validator",
    "@packages/auto-healer",
    "@packages/queue",
    "@packages/sandbox"
  ],

  webpack: (config) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@packages/utils": path.resolve(process.cwd(), "../../packages/utils/src"),
      "@packages/context": path.resolve(process.cwd(), "../../packages/context/src"),
      "@packages/shared-services": path.resolve(process.cwd(), "../../packages/shared-services/src"),
      "@packages/db": path.resolve(process.cwd(), "../../packages/db/src"),
      "@packages/observability": path.resolve(process.cwd(), "../../packages/observability/src"),
    };

    if (!config.externals) config.externals = [];
    config.externals.push({
      "cpu-features": "commonjs cpu-features",
    });

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
