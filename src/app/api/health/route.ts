import { NextResponse } from 'next/server';
import redis from '@/lib/redis';
import logger from '@/lib/logger';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';

export const dynamic = 'force-dynamic';

export async function GET() {
    const supabase = createRouteHandlerClient({ cookies });

    try {
        const checks: any = {
            redis: 'healthy',
            worker: 'unknown',
            database: 'healthy',
            recommendation: 'live'
        };

        // 1. Check Redis
        try {
            await redis.ping();
        } catch (err) {
            checks.redis = 'unavailable';
            checks.recommendation = 'offline';
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
        } catch (err) {
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
        } catch (err) {
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
        } catch (err) {
            checks.governance = { status: 'error' };
        }

        const status = checks.recommendation === 'offline' ? 503 : 200;
        return NextResponse.json(checks, { status });

    } catch (error: any) {
        logger.error({ error }, 'Global health check failed');
        return NextResponse.json({ status: 'error', message: error.message }, { status: 500 });
    }
}
