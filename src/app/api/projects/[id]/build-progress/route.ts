import { NextRequest } from 'next/server';
import redis from '@/lib/redis';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const projectId = params.id;
    const executionId = req.nextUrl.searchParams.get('executionId');

    if (!executionId) {
        return new Response('executionId is required', { status: 400 });
    }

    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            const channel = `build:progress:${executionId}`;
            const subRedis = redis.duplicate();

            const send = (data: any) => {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
            };

            // 1. Send initial state from cache if exists
            const cachedState = await redis.get(`build:state:${executionId}`);
            if (cachedState) {
                send(JSON.parse(cachedState));
            }

            // 2. Subscribe to real-time updates
            await subRedis.subscribe(channel);

            subRedis.on('message', (chan, message) => {
                if (chan === channel) {
                    send(JSON.parse(message));

                    // If completed or failed, we can close the connection from server side eventually
                    const data = JSON.parse(message);
                    if (data.status === 'completed' || data.status === 'failed') {
                        // In SSE, usually we let client close, but we could provide a signal
                    }
                }
            });

            // 3. Keep-alive heartbeat
            const heartbeat = setInterval(() => {
                controller.enqueue(encoder.encode(': heartbeat\n\n'));
            }, 15000);

            req.signal.addEventListener('abort', () => {
                clearInterval(heartbeat);
                subRedis.unsubscribe(channel);
                subRedis.quit();
                controller.close();
            });
        },
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
        },
    });
}
