"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.baseConfig = void 0;
exports.baseConfig = {
    format: ['cjs', 'esm'],
    dts: true,
    clean: true,
    sourcemap: true,
    minify: false,
    splitting: false,
    target: 'node20',
    bundle: true,
    outDir: "dist",
    shims: true,
    external: [
        /^@packages\//,
        'bullmq',
        'ioredis',
        'pino',
        'uuid',
        'fs-extra',
        'archiver',
        'dotenv',
        'zod',
        'react',
        'stripe',
        'prom-client',
        'redlock',
        'next',
        'socket.io-client',
        '@supabase/supabase-js',
        '@temporalio/client',
        '@temporalio/worker',
        'axios',
        'express',
        'socket.io',
        'cors',
        'jsonwebtoken',
        'dockerode'
    ],
};
//# sourceMappingURL=tsup.config.base.js.map