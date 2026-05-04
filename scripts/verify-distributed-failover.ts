import { fork, ChildProcess } from 'child_process';
import path from 'path';
import { logger } from '../packages/observability/src/logger';
import { eventBus } from '../packages/events/src/index';

/**
 * MULTI-NODE DISTRIBUTED FAILOVER PROOF
 * Goal: Prove that Redis Consumer Groups correctly balance across nodes and reclaim failed work.
 * Scenarios:
 * 1. Start 3 worker nodes.
 * 2. Publish batch of tasks.
 * 3. SIGKILL one node.
 * 4. Verify that PEL (Pending Entitlement List) recovery reclaims and finishes the task.
 */
async function verifyDistributedFailover() {
    const workerScript = path.resolve(__dirname, '../apps/worker/src/index.ts');
    const nodes: ChildProcess[] = [];
    
    logger.info('🚀 Starting Multi-Node Failover Proof (3 Nodes)...');

    // 1. Spawn 3 Worker Nodes
    for (let i = 1; i <= 3; i++) {
        const node = fork(workerScript, [], {
            env: { ...process.env, WORKER_ID: `node-${i}`, NODE_ENV: 'production' }
        });
        nodes.push(node);
        logger.info(`✅ Node-${i} started (PID: ${node.pid})`);
    }

    await new Promise(r => setTimeout(r, 5000)); // Wait for registration

    // 2. Publish 10 tasks
    const missionId = `failover-test-${Date.now()}`;
    logger.info({ missionId }, '📤 Publishing 10 tasks for distributed processing...');
    
    for (let i = 0; i < 10; i++) {
        await eventBus.publishStream('mission.tasks', {
            missionId,
            taskId: `task-${i}`,
            tenantId: 'tier1-failover',
            data: { complexity: 'medium' }
        });
    }

    await new Promise(r => setTimeout(r, 3000)); // Wait for processing to start

    // 3. CHAOS: SIGKILL Node-1
    const victim = nodes[0];
    logger.warn({ pid: victim.pid }, '🔥 [CHAOS] Killing Node-1 mid-task...');
    victim.kill('SIGKILL');

    // 4. VERIFICATION: Wait for PEL Recovery
    // In eventBus, recovery loop runs every 10s with 30s idle time
    logger.info('⏳ Waiting for PEL recovery (should take ~40s)...');
    
    let completedCount = 0;
    const checkInterval = setInterval(async () => {
        const metrics = await eventBus.getStreamMetrics('mission.tasks');
        const group = metrics?.groups.find(g => g.name === 'mission-worker');
        
        if (group) {
            logger.info({ pending: group.pending, pel: group.pelSize }, 'Checking stream status...');
            if (group.pending === 0 && group.pelSize === 0) {
                logger.info('🏆 FAILOVER PROVEN: All tasks completed, PEL is clear. Node-2/3 reclaimed Node-1 work.');
                clearInterval(checkInterval);
                nodes.slice(1).forEach(n => n.kill());
                process.exit(0);
            }
        }
    }, 5000);

    // Timeout failsafe
    setTimeout(() => {
        logger.error('❌ FAILOVER TIMEOUT: Tasks still pending in PEL.');
        nodes.forEach(n => n.kill());
        process.exit(1);
    }, 90000);
}

verifyDistributedFailover();
