import { NextRequest, NextResponse } from 'next/server';
import redis from '@libs/utils/server';
import { logger } from '@libs/utils/server';

export const dynamic = 'force-dynamic';

/**
 * GET /api/preview/:executionId
 *
 * Returns the current preview URL for a completed build.
 * In local dev: the build state in Redis has a previewUrl stored by the orchestrator.
 * In production: this would query a real container registry / sandbox controller.
 */
export async function GET(
    _req: NextRequest,
    { params }: { params: { executionId: string } }
) {
    const { executionId } = params;

    if (!executionId) {
        return NextResponse.json({ error: 'executionId is required' }, { status: 400 });
    }

    try {
        // 1. Check cached build state (populated by orchestrator on completion)
        const cached = await redis.get(`build:state:${executionId}`);
        if (cached) {
            const state = JSON.parse(cached);
            if (state.previewUrl) {
                return NextResponse.json({
                    previewUrl: state.previewUrl,
                    status: state.status,
                    executionId,
                });
            }
        }

        // 2. Check dedicated preview key (set by sandbox/deployment stage)
        const previewData = await redis.get(`deployment:preview:${executionId}`);
        if (previewData) {
            const parsed = JSON.parse(previewData);
            return NextResponse.json({
                previewUrl: parsed.previewUrl,
                status: 'completed',
                executionId,
            });
        }

        // 3. No preview available yet
        return NextResponse.json(
            { previewUrl: null, status: 'pending', executionId },
            { status: 202 }
        );
    } catch (error) {
        logger.error({ error, executionId }, 'Preview URL lookup failed');
        return NextResponse.json({ error: 'Failed to retrieve preview URL' }, { status: 500 });
    }
}
