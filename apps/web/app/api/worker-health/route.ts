import { NextResponse } from 'next/server';
import redis from '@libs/utils/server';
import { logger } from '@libs/utils/server';

export const dynamic = 'force-dynamic';

export async function GET() {
    try {
        const heartbeat = await redis.get('system:health:worker');

        if (!heartbeat) {
            return NextResponse.json({
                status: 'offline',
                message: 'No worker heartbeat detected'
            }, { status: 503 });
        }

        const data = JSON.parse(heartbeat);
        const age = (Date.now() - data.lastSeen) / 1000;

        // Worker emits heartbeat every 5s, expires in 15s.
        if (age > 15) {
            return NextResponse.json({
                status: 'stale',
                message: 'Worker heartbeat is stale',
                ageSeconds: age
            }, { status: 503 });
        }

        return NextResponse.json({
            status: 'active',
            lastSeen: new Date(data.lastSeen).toISOString(),
            concurrency: {
                free: data.freeConcurrency,
                pro: data.proConcurrency
            }
        }, { status: 200 });

    } catch (error) {
        logger.error({ error }, 'Worker health check failed');
        return NextResponse.json({
            status: 'error',
            message: 'Failed to retrieve worker status'
        }, { status: 500 });
    }
}
