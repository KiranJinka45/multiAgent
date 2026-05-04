import path from 'node:path';
import dotenv from 'dotenv';
dotenv.config({ path: path.join(__dirname, '../../../.env') });
import cluster from 'node:cluster';
cluster.schedulingPolicy = cluster.SCHED_RR;

import os from 'node:os';
import { logger } from '@packages/observability';

console.log(`[Gateway] NO_CLUSTER: ${process.env.NO_CLUSTER}`);
if (cluster.isPrimary && process.env.NO_CLUSTER !== 'true') {
    const rawCpuCount = os.cpus().length;
    // Cap at 4 workers in dev to prevent OOM on high-core machines, unless CLUSTER_WORKERS is set.
    const maxWorkers = process.env.CLUSTER_WORKERS ? parseInt(process.env.CLUSTER_WORKERS) : Math.min(rawCpuCount, 4);
    
    logger.info(`[Gateway] Primary Cluster Manager ${process.pid} is running`);
    
    // Tier-1 SRE: Start the Autonomous Control Plane engine in the primary process
    import('@packages/utils').then(({ ControlPlane, redis }) => {
        const cp = new ControlPlane(redis);
        cp.start();
        logger.info('🚀 [ControlPlane] Autonomous governance engine started in Primary Process');
    }).catch(err => {
        logger.error({ err }, '❌ [ControlPlane] Failed to start governance engine');
    });

    logger.info(`[Gateway] Forking ${maxWorkers} worker processes (Detected Cores: ${rawCpuCount})...`);

    // Stagger forks to prevent EADDRINUSE race conditions on Windows
    const forkWorker = (index: number) => {
        setTimeout(() => {
            if (cluster.isPrimary) {
                const worker = cluster.fork();
                logger.info({ pid: worker.process.pid, index }, `[Gateway] Worker process spawned`);
            }
        }, index * 1500); // Increased gap for stability
    };

    for (let i = 0; i < maxWorkers; i++) {
        forkWorker(i);
    }

    cluster.on('exit', (worker, code, signal) => {
        if (code !== 0 && !worker.exitedAfterDisconnect) {
            logger.warn({ pid: worker.process.pid, code, signal }, `[Gateway] Worker proxy crashed! Spawning replacement in 3s...`);
            setTimeout(() => cluster.isPrimary && cluster.fork(), 3000);
        }
    });
} else {
    // Single process mode or worker process
    import('@packages/config').then(async (m) => {
        const SecretProvider = m.SecretProvider;
        if (!SecretProvider || typeof SecretProvider.bootstrap !== 'function') {
            console.error('[Gateway] FATAL: SecretProvider.bootstrap not found in @packages/config', m);
            process.exit(1);
        }
        await SecretProvider.bootstrap();
        
        const { startGatewayServer } = await import('./server');
        startGatewayServer().catch(err => {
            logger.error({ err }, '[Gateway] Failed to start server');
            process.exit(1);
        });
    }).catch(err => {
        console.error('[Gateway] Failed to load config/server:', err);
        process.exit(1);
    });
}
