import { NextResponse } from 'next/server';
import { redis } from '@libs/utils';

export async function GET() {
    try {
        // 1. Check Redis
        const isRedisUp = await redis.ping().catch(() => false) === 'PONG';
        
        // 2. Check Socket Server
        let isSocketUp = false;
        try {
            const socketRes = await fetch('http://localhost:3010/health', { signal: AbortSignal.timeout(500) });
            isSocketUp = socketRes.ok;
        } catch {}

        // 3. Determine Recommendation for UI (Quantum-v2 protocol)
        let recommendation = 'live';
        if (!isRedisUp || !isSocketUp) {
            recommendation = 'offline';
        } else {
            // Check for at least one active worker via heartbeats
            const workerKeys = await redis.keys('worker:heartbeat:*');
            if (workerKeys.length === 0) {
                recommendation = 'polling';
            }
        }

        return NextResponse.json({
            status: isRedisUp ? 'ok' : 'error',
            recommendation,
            services: {
                redis: isRedisUp,
                socket: isSocketUp,
                workers: await redis.keys('worker:heartbeat:*').then(k => k.length)
            },
            timestamp: new Date().toISOString()
        });
    } catch (error) {
        return NextResponse.json({ 
            status: 'error', 
            recommendation: 'offline',
            error: String(error)
        }, { status: 200 }); // Still return 200 to prevent fetch errors but show 'offline'
    }
}
