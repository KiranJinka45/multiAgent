import { NextResponse } from 'next/server';
import { redis } from '@libs/utils';
import Docker from 'dockerode';

const docker = new Docker();

export async function GET() {
    try {
        const health = {
            redis: false,
            docker: false,
            socket: false,
            workers: 0,
            timestamp: Date.now()
        };

        // 1. Check Redis
        try {
            const ping = await redis.ping();
            health.redis = ping === 'PONG';
        } catch {
            health.redis = false;
        }

        // 2. Check Docker
        try {
            await docker.ping();
            health.docker = true;
        } catch {
            health.docker = false;
        }

        // 3. Check Socket Server
        try {
            const socketRes = await fetch('http://localhost:3011/health', { signal: AbortSignal.timeout(1000) });
            health.socket = socketRes.ok;
        } catch {
            health.socket = false;
        }

        // 4. Check Workers (based on heartbeats in Redis)
        const workerKeys = await redis.keys('worker:heartbeat:*');
        health.workers = workerKeys.length;

        // Ensure we return the 'ok' composite status if everything is green
        const isHealthy = health.redis && health.socket; // Docker optional
        
        return NextResponse.json({
            ...health,
            ok: isHealthy
        });
    } catch (error) {
        return NextResponse.json({ 
            error: 'Failed to fetch system health',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
