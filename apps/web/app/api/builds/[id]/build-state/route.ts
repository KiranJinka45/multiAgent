import { NextRequest, NextResponse } from 'next/server';
import redis from '@libs/utils';
import logger from '@libs/utils';
import { createRouteHandlerClient } from '@libs/supabase';
import { cookies } from 'next/headers';
import { projectService } from '@libs/utils';

export const dynamic = 'force-dynamic';

export async function GET(
    req: NextRequest
) {
    const executionId = req.nextUrl.searchParams.get('executionId');

    if (!executionId) {
        return NextResponse.json({ error: 'executionId is required' }, { status: 400 });
    }

    const projectId = req.nextUrl.pathname.split('/')[3]; // /api/projects/[id]/build-state
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify Project Ownership
    const isOwner = await projectService.verifyProjectOwnership(projectId, session.user.id, supabase);
    if (!isOwner) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    try {
        const cachedState = await redis.get(`build:state:${executionId}`);
        if (cachedState) {
            return NextResponse.json(JSON.parse(cachedState));
        }

        return NextResponse.json({ status: 'pending', totalProgress: 0, message: 'Waiting for build data...', stages: [] });
    } catch (error) {
        logger.error(error instanceof Error ? error : new Error(String(error)), 'Failed to fetch build state');
        return NextResponse.json({ error: 'Failed to fetch build state' }, { status: 500 });
    }
}
