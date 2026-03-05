import { NextRequest } from 'next/server';
import redis from '@/lib/redis';
import { getLatestBuildState } from '@/lib/event-bus';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Server-Sent Events (SSE) Endpoint for Build Progress
 * 
 * Synchronizes the frontend DevOps Dashboard with the backend build pipeline.
 * Uses Redis Streams (XREAD BLOCK) to ensure events are delivered reliably 
 * and allowing clients to catch up if they disconnect temporarily.
 */
export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const executionId = searchParams.get('executionId');

    if (!executionId) {
        return new Response('Missing executionId', { status: 400 });
    }

    const streamKey = `build:stream:${executionId}`;
    const encoder = new TextEncoder();

    const stream = new ReadableStream({
        async start(controller) {
            // Dedicated connection for blocking read
            const subRedis = redis.duplicate();
            let lastId = '0'; // Start from beginning of the stream

            const cleanup = () => {
                subRedis.quit();
                try {
                    controller.close();
                } catch (e) {
                    // Ignore already closed errors
                }
            };

            // 1. Initial State Hydration
            // Send the latest snapshot immediately so the UI doesn't show 0% if already in progress
            const initialState = await getLatestBuildState(executionId);
            if (initialState) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify(initialState)}\n\n`));
            }

            // 2. Main Event Loop
            try {
                while (true) {
                    // Block for up to 20 seconds waiting for new events
                    // ioredis returns: [[streamKey, [[id, [field, value, ...]], ...]]] | null
                    const response = await (subRedis as any).xread(
                        'BLOCK', 20000,
                        'STREAMS', streamKey, lastId
                    );

                    if (!response) {
                        // Heartbeat to keep connection alive
                        controller.enqueue(encoder.encode(`data: {"type":"heartbeat","timestamp":${Date.now()}}\n\n`));
                        continue;
                    }

                    const [, events] = response[0];
                    for (const [id, fields] of events) {
                        lastId = id;
                        // fields array is flat: ['data', '{...}']
                        const dataIdx = fields.indexOf('data');
                        const rawData = dataIdx !== -1 ? fields[dataIdx + 1] : '{}';
                        const data = JSON.parse(rawData);

                        // SSE Format: [event: name\n] [id: ID\n] data: JSON\n\n
                        controller.enqueue(encoder.encode(`id: ${id}\ndata: ${rawData}\n\n`));

                        // Terminate stream if the build is over
                        if (data.status === 'completed' || data.status === 'failed' || data.type === 'complete' || data.type === 'error') {
                            cleanup();
                            return;
                        }
                    }
                }
            } catch (err) {
                console.error(`[SSE] Error for executionId ${executionId}:`, err);
                cleanup();
            }

            // Handle client disconnect
            req.signal.addEventListener('abort', () => {
                cleanup();
            });
        }
    });

    return new Response(stream, {
        headers: {
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache, no-transform',
            'Connection': 'keep-alive',
        }
    });
}
