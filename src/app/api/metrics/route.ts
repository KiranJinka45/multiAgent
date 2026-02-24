import { NextResponse } from 'next/server';
import { registry } from '@/lib/metrics';
import { env } from '@/lib/env';

export async function GET(req: Request) {
    const authHeader = req.headers.get('authorization');
    if (!authHeader || authHeader !== `Bearer ${env.METRICS_TOKEN}`) {
        return new NextResponse('Unauthorized', { status: 401 });
    }

    try {
        const metrics = await registry.metrics();
        return new NextResponse(metrics, {
            status: 200,
            headers: {
                'Content-Type': registry.contentType,
            },
        });
    } catch (error) {
        console.error('Metrics collection failed', error);
        return new NextResponse('Internal Server Error', { status: 500 });
    }
}
