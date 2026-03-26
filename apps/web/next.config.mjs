import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

/** @type {import('next').NextConfig} */
const nextConfig = {
  transpilePackages: [
    "@libs/contracts",
    "@libs/supabase",
    "@libs/registry",
    "@libs/observability",
    "@libs/resilience",
    "@libs/ai",
    "@libs/shared-services"
  ],
  experimental: {
    externalDir: true,
    serverComponentsExternalPackages: [
      "@libs/utils", "@libs/brain", "@libs/core-engine", "@libs/runtime",
      "dockerode", "ssh2", "cpu-features", "pino", "bullmq", "ioredis",
      "@prisma/client", "groq-sdk", "express", "socket.io"
    ],
  },
  webpack: (config, { isServer }) => {
    config.resolve.alias = {
      ...config.resolve.alias,
      // Specific subpath aliases (must come first for precedence)
      "@libs/utils/server": path.resolve(__dirname, "../../packages/utils/src/server"),
      "@libs/utils/client": path.resolve(__dirname, "../../packages/utils/src/client"),
      "@libs/config": path.resolve(__dirname, "../../packages/utils/src/config"),
      "@libs/services": path.resolve(__dirname, "../../packages/utils/src/server"),
      // Package-level aliases
      "@libs/utils": path.resolve(__dirname, "../../packages/utils/src"),
      "@libs/observability": path.resolve(__dirname, "../../packages/observability/src"),
      "@libs/runtime": path.resolve(__dirname, "../../apps/preview-runtime/src"),
      "@libs/registry": path.resolve(__dirname, "../../packages/registry/src"),
      "@libs/brain": path.resolve(__dirname, "../../packages/brain/src"),
      "@libs/contracts": path.resolve(__dirname, "../../packages/contracts/src"),
      "@libs/core-engine": path.resolve(__dirname, "../../packages/core-engine/src"),
      "@libs/supabase": path.resolve(__dirname, "../../packages/supabase/src"),
      "@libs/resilience": path.resolve(__dirname, "../../packages/resilience/src"),
      "@libs/ai": path.resolve(__dirname, "../../packages/ai/src"),
      "@libs/agents": path.resolve(__dirname, "../../packages/agents/src"),
      "@libs/tools": path.resolve(__dirname, "../../packages/tools/src"),
      "@libs/shared-services": path.resolve(__dirname, "../../packages/shared-services/src"),
      "@libs/db": path.resolve(__dirname, "../../packages/db/src"),
      "@libs/validator": path.resolve(__dirname, "../../packages/validator/src"),
    };
    config.optimization.minimize = false;
    if (isServer) {
      // Mark native Node.js modules as external on server builds
      config.externals = [
        ...(Array.isArray(config.externals) ? config.externals : config.externals ? [config.externals] : []),
        'dockerode', 'ssh2', 'cpu-features',
      ];
    }
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
