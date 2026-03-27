const path = require('path');

/** @type {import('next').NextConfig} */
module.exports = {
  webpack: (config) => {
    config.resolve = config.resolve || {};
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      net: false,
      tls: false,
      http2: false,
    };

    config.resolve.alias = {
      ...config.resolve.alias,
      '@packages/ui': path.resolve(__dirname, '../../packages/ui/src'),
      '@packages/utils': path.resolve(__dirname, '../../packages/utils/src'),
      '@packages/contracts': path.resolve(__dirname, '../../packages/contracts/src'),
      '@packages/db': path.resolve(__dirname, '../../packages/db/src'),
      '@packages/observability': path.resolve(__dirname, '../../packages/observability/src'),
    };

    return config;
  },
  // Ensure we don't crash on instrumentation if it leaks in
  experimental: {
    instrumentationHook: false
  }
};
