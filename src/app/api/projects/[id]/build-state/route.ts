import { NextRequest, NextResponse } from 'next/server';
import redis from '@/lib/redis';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const executionId = req.nextUrl.searchParams.get('executionId');

    if (!executionId) {
        return NextResponse.json({ error: 'executionId is required' }, { status: 400 });
    }

    try {
        const cachedState = await redis.get(`build:state:${executionId}`);
        if (cachedState) {
            return NextResponse.json(JSON.parse(cachedState));
        }

        return NextResponse.json({ status: 'pending', totalProgress: 0, message: 'Waiting for build data...', stages: [] });
    } catch (error: any) {
        logger.error(error, 'Failed to fetch build state');
        return NextResponse.json({ error: 'Failed to fetch build state' }, { status: 500 });
    }
}
