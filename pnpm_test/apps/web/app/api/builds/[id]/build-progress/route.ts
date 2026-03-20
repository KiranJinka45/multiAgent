import { NextRequest } from 'next/server';
import redis from '@queue';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { projectService } from '@services/project-service';

export const dynamic = 'force-dynamic';

export async function GET(
    req: NextRequest
) {
    try {
        const executionId = req.nextUrl.searchParams.get('executionId');

        if (!executionId) {
            return new Response(JSON.stringify({ error: 'executionId is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        const projectId = req.nextUrl.pathname.split('/')[3]; // /api/projects/[id]/build-progress
        if (!projectId) {
            return new Response(JSON.stringify({ error: 'projectId is required' }), { status: 400, headers: { 'Content-Type': 'application/json' } });
        }

        const supabase = createRouteHandlerClient({ cookies });
        const { data: { session }, error: sessionError } = await supabase.auth.getSession();

        if (sessionError || !session) {
            console.error('SSE Auth error:', sessionError);
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: { 'Content-Type': 'application/json' } });
        }

        // Verify Project Ownership
        const isOwner = await projectService.verifyProjectOwnership(projectId, session.user.id, supabase);
        if (!isOwner) {
            console.error(`SSE Forbidden: User ${session.user.id} does not own project ${projectId}`);
            return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403, headers: { 'Content-Type': 'application/json' } });
        }

        const encoder = new TextEncoder();

        const stream = new ReadableStream({
            async start(controller) {
                try {
                    const channel = `build:progress:${executionId}`;
                    const subRedis = redis.duplicate();


                    // 0. Set retry interval for browser
                    controller.enqueue(encoder.encode(`retry: 3000\n\n`));

                    // 1. Send initial state from cache (Full Reconstruction)
                    const cachedState = await redis.get(`build:state:${executionId}`);
                    if (cachedState) {
                        const state = JSON.parse(cachedState);
                        // Add an event ID for Reconnection support (timestamp works well)
                        const eventId = state.timestamp || Date.now().toString();
                        controller.enqueue(encoder.encode(`id: ${eventId}\ndata: ${JSON.stringify(state)}\n\n`));
                    }

                    // 2. Subscribe to real-time updates
                    await subRedis.subscribe(channel);

                    subRedis.on('message', (chan, message) => {
                        if (chan === channel) {
                            const data = JSON.parse(message);
                            const eventId = data.timestamp || Date.now().toString();
                            controller.enqueue(encoder.encode(`id: ${eventId}\ndata: ${message}\n\n`));
                        }
                    });

                    // 3. Keep-alive heartbeat
                    const heartbeat = setInterval(() => {
                        try {
                            controller.enqueue(encoder.encode(': heartbeat\n\n'));
                        } catch {
                            console.error('SSE enqueue error');
                        }
                    }, 15000);

                    req.signal.addEventListener('abort', () => {
                        clearInterval(heartbeat);
                        subRedis.unsubscribe(channel);
                        subRedis.quit();
                        try {
                            controller.close();
                        } catch {
                            console.error('SSE stream close error');
                        }
                    });
                } catch (startError) {
                    console.error('SSE start stream error:', startError);
                    controller.error(startError);
                }
            },
        });

        return new Response(stream, {
            headers: {
                'Content-Type': 'text/event-stream',
                'Cache-Control': 'no-cache, no-transform',
                'Connection': 'keep-alive',
            },
        });
    } catch (globalError) {
        console.error('SSE Critical Error:', globalError);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500, headers: { 'Content-Type': 'application/json' } });
    }
}
