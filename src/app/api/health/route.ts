import { NextResponse } from 'next/server';
import redis from '@queue/redis-client';
import logger from '@configs/logger';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { QUEUE_FREE, QUEUE_PRO } from '@queue/build-queue';
import { Queue } from 'bullmq';

export const dynamic = 'force-dynamic';

interface HealthChecks {
    redis: string;
    worker: string;
    database: string;
    recommendation: 'live' | 'polling' | 'offline';
    governance?: {
        status: string;
        lastRun: string | null;
    };
}

export async function GET() {
    const supabase = createRouteHandlerClient({ cookies });

    try {
        const checks: HealthChecks = {
            redis: 'healthy',
            worker: 'unknown',
            database: 'healthy',
            recommendation: 'live'
        };

        // 1. Check Redis
        const startPing = Date.now();
        try {
            await redis.ping();
            checks.redis = `healthy (${Date.now() - startPing}ms)`;
        } catch {
            checks.redis = 'unavailable';
            checks.recommendation = 'offline';
        }

        // 1.5 Check Queues
        try {
            const freeQueue = new Queue(QUEUE_FREE, { connection: redis });
            const proQueue = new Queue(QUEUE_PRO, { connection: redis });
            const [freeCount, proCount] = await Promise.all([
                freeQueue.getJobCounts('wait', 'active', 'delayed'),
                proQueue.getJobCounts('wait', 'active', 'delayed')
            ]);
            (checks as any).queues = {
                free: freeCount,
                pro: proCount
            };
            await Promise.all([freeQueue.close(), proQueue.close()]);
        } catch (err) {
            logger.error({ err }, 'Queue health check failed');
        }

        // 2. Check Worker Heartbeat
        try {
            const heartbeat = await redis.get('system:health:worker');
            if (heartbeat) {
                const data = JSON.parse(heartbeat);
                const age = (Date.now() - data.lastSeen) / 1000;
                if (age < 15) {
                    checks.worker = 'healthy';
                } else {
                    checks.worker = 'stale';
                    if (checks.recommendation !== 'offline') checks.recommendation = 'polling';
                }
            } else {
                checks.worker = 'offline';
                if (checks.recommendation !== 'offline') checks.recommendation = 'polling';
            }
        } catch {
            checks.worker = 'error';
        }

        // 3. Check Database (Supabase)
        try {
            const { error } = await supabase.from('projects').select('id', { count: 'exact', head: true }).limit(1);
            if (error) {
                checks.database = 'unreachable';
                checks.recommendation = 'offline';
            } else {
                checks.database = 'healthy';
            }
        } catch {
            checks.database = 'error';
        }

        // 4. Check Governance Reconciliation
        try {
            const reconStatus = await redis.get('system:reconciliation:status');
            if (reconStatus) {
                checks.governance = JSON.parse(reconStatus);
            } else {
                checks.governance = { status: 'pending', lastRun: null };
            }
        } catch {
            checks.governance = { status: 'error', lastRun: null };
        }

        const status = checks.recommendation === 'offline' ? 503 : 200;
        return NextResponse.json(checks, { status });

    } catch (error) {
        logger.error({ error }, 'Global health check failed');
        return NextResponse.json({
            status: 'error',
            message: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
