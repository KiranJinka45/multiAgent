import 'dotenv/config';
import cluster from 'node:cluster';
cluster.schedulingPolicy = cluster.SCHED_RR;

import os from 'node:os';
import { logger } from '@packages/observability';

if (cluster.isPrimary) {
    const rawCpuCount = os.cpus().length;
    // Cap at 4 workers in dev to prevent OOM on high-core machines, unless CLUSTER_WORKERS is set.
    const maxWorkers = process.env.CLUSTER_WORKERS ? parseInt(process.env.CLUSTER_WORKERS) : Math.min(rawCpuCount, 4);
    
    logger.info(`[Gateway] Primary Cluster Manager ${process.pid} is running`);
    logger.info(`[Gateway] Forking ${maxWorkers} worker processes (Detected Cores: ${rawCpuCount})...`);

    // Stagger forks to prevent EADDRINUSE race conditions on Windows
    for (let i = 0; i < maxWorkers; i++) {
        setTimeout(() => {
            if (cluster.isPrimary) {
                cluster.fork();
            }
        }, i * 1000); // 1 second gap per worker
    }

    cluster.on('exit', (worker, code, signal) => {
        logger.warn({ pid: worker.process.pid, code, signal }, `[Gateway] Worker proxy died! Spawning replacement...`);
        cluster.fork();
    });
} else {
    // Dynamic import of the server logic only in workers
    import('./server.js').then(({ startGatewayServer }) => {
        startGatewayServer().catch(err => {
            logger.error({ err }, '[Gateway] Failed to start worker server');
            process.exit(1);
        });
    }).catch(err => {
        console.error('[Gateway] Failed to load server module:', err);
        process.exit(1);
    });
}
