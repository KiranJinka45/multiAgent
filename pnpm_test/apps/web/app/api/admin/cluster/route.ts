import { NextRequest, NextResponse } from 'next/server';
import { NodeRegistry } from '@runtime/cluster/nodeRegistry';
import { RuntimeScheduler } from '@runtime/cluster/runtimeScheduler';
import { FailoverManager } from '@runtime/cluster/failoverManager';
import { RollingRestart } from '@runtime/cluster/rollingRestart';
import { StaleEvictor } from '@runtime/cluster/staleEvictor';
import { RedisRecovery } from '@runtime/cluster/redisRecovery';
import logger from '@config/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/cluster
 *
 * Full cluster state including Phase 4 additions:
 *  - Nodes with scores + draining status
 *  - Rolling restart state
 *  - Redis health
 *  - Eviction stats
 */
export async function GET() {
    try {
        const [
            clusterSnapshot,
            failoverSnapshot,
            rollingRestartState,
            redisAlive,
            lastRecovery,
        ] = await Promise.all([
            RuntimeScheduler.getClusterSnapshot(),
            FailoverManager.getSnapshot(),
            RollingRestart.getState(),
            RedisRecovery.isRedisAlive(),
            RedisRecovery.getLastRecovery(),
        ]);

        return NextResponse.json({
            cluster: {
                ...clusterSnapshot,
                failover: failoverSnapshot,
            },
            thisNode: {
                nodeId: NodeRegistry.getNodeId(),
                runningCount: NodeRegistry.getRunningCount(),
                maxRuntimes: NodeRegistry.getMaxRuntimes(),
            },
            rollingRestart: rollingRestartState,
            redis: {
                alive: redisAlive,
                lastRecovery,
            },
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        logger.error({ err }, '[AdminAPI] cluster status failed');
        return NextResponse.json({ error: 'Failed to get cluster status' }, { status: 500 });
    }
}

/**
 * POST /api/admin/cluster
 *
 * Actions:
 *  - 'trigger-failover'   — manually run a failover cycle
 *  - 'rolling-restart'    — start zero-downtime rolling restart
 *  - 'eviction-scan'      — manually trigger stale runtime eviction
 *  - 'redis-recovery'     — manually trigger Redis state recovery
 */
export async function POST(req: NextRequest) {
    const body = await req.json().catch(() => ({}));
    const { action } = body;

    try {
        switch (action) {
            case 'trigger-failover': {
                await FailoverManager.runFailoverCycle();
                return NextResponse.json({ action, success: true });
            }

            case 'rolling-restart': {
                // Fire-and-forget since this takes minutes
                RollingRestart.start().catch(err => {
                    logger.error({ err }, '[AdminAPI] Rolling restart failed');
                });
                return NextResponse.json({
                    action,
                    started: true,
                    message: 'Rolling restart initiated. Poll GET /api/admin/cluster for progress.',
                });
            }

            case 'eviction-scan': {
                const result = await StaleEvictor.runEvictionScan();
                return NextResponse.json({ action, success: true, result });
            }

            case 'redis-recovery': {
                const result = await RedisRecovery.performRecovery();
                return NextResponse.json({ action, success: true, result });
            }

            default:
                return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
        }
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error({ action, err }, '[AdminAPI] cluster action failed');
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
