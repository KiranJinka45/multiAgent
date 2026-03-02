import { NextRequest } from 'next/server';
import redis from '@/lib/redis';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { projectService } from '@/lib/project-service';

export const dynamic = 'force-dynamic';

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const executionId = req.nextUrl.searchParams.get('executionId');
        const projectId = params.id;

        if (!executionId) {
            return new Response(JSON.stringify({ error: 'executionId is required' }), { status: 400 });
        }

        const supabase = createRouteHandlerClient({ cookies });
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 });
        }

        const isOwner = await projectService.verifyProjectOwnership(projectId, session.user.id, supabase);
        if (!isOwner) {
            return new Response(JSON.stringify({ error: 'Forbidden' }), { status: 403 });
        }

        const cachedState = await redis.get(`build:state:${executionId}`);
        if (!cachedState) {
            return new Response(JSON.stringify({ error: 'State not found' }), { status: 404 });
        }

        return new Response(cachedState, {
            headers: { 'Content-Type': 'application/json' }
        });

    } catch (err) {
        console.error('Build state fetch error:', err);
        return new Response(JSON.stringify({ error: 'Internal Server Error' }), { status: 500 });
    }
}
