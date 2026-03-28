import { NextResponse } from 'next/server';
import { redis } from '@packages/utils/server';

export async function GET() {
    try {
        const workerKeys = await redis.keys('worker:heartbeat:*');
        const workers = await Promise.all(workerKeys.map(async (key) => {
            const data = await redis.get(key);
            const stats = JSON.parse(data || '{}');
            return {
                id: key.replace('worker:heartbeat:', ''),
                ...stats,
                lastSeen: await redis.ttl(key) // seconds until expiry
            };
        }));

        return NextResponse.json({
            count: workers.length,
            workers,
            timestamp: Date.now()
        });
    } catch (error) {
        return NextResponse.json({ 
            error: 'Failed to fetch workers list',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
