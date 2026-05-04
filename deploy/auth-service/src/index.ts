import 'dotenv/config';
import cluster from 'node:cluster';
cluster.schedulingPolicy = cluster.SCHED_RR;

import os from 'node:os';
import { logger } from '@packages/observability';

if (cluster.isPrimary) {
    const rawCpuCount = os.cpus().length;
    // Cap at 4 workers in dev to prevent OOM on high-core machines.
    const maxWorkers = process.env.CLUSTER_WORKERS ? parseInt(process.env.CLUSTER_WORKERS) : Math.min(rawCpuCount, 4);

    logger.info(`[AuthService] Primary Cluster Manager ${process.pid} is running`);
    logger.info(`[AuthService] Forking ${maxWorkers} worker processes (Detected Cores: ${rawCpuCount})...`);

    // Stagger forks to prevent race conditions
    for (let i = 0; i < maxWorkers; i++) {
        setTimeout(() => {
            if (cluster.isPrimary) {
                cluster.fork();
            }
        }, i * 1000); // 1 second gap per worker
    }

    cluster.on('exit', (worker, code, signal) => {
        logger.warn({ pid: worker.process.pid, code, signal }, `[AuthService] Worker identity process died! Spawning replacement...`);
        cluster.fork();
    });
} else {
    // Dynamic import of the server logic only in workers
    import('./server.js').then(({ startAuthServer }) => {
        startAuthServer().catch(err => {
            logger.error({ err }, '[AuthService] Failed to start worker server');
            process.exit(1);
        });
    }).catch(err => {
        console.error('[AuthService] Failed to load server module:', err);
        process.exit(1);
    });
}
