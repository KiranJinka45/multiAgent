import { NextRequest, NextResponse } from 'next/server';
import { PreviewOrchestrator } from '@packages/runtime/previewOrchestrator';
import { logger } from '@packages/utils/server';

export const dynamic = 'force-dynamic';

/**
 * GET  /api/runtime/[projectId]  — get current runtime status
 * POST /api/runtime/[projectId]  — trigger start/stop/restart
 */

export async function GET(
    _req: NextRequest,
    { params }: { params: { projectId: string } }
) {
    const { projectId } = params;
    try {
        const status = await PreviewOrchestrator.getStatus(projectId);
        return NextResponse.json({ projectId, ...status });
    } catch (err) {
        logger.error({ projectId, err }, '[API/runtime] GET failed');
        return NextResponse.json({ error: 'Failed to get runtime status' }, { status: 500 });
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: { projectId: string } }
) {
    const { projectId } = params;
    const body = await req.json().catch(() => ({}));
    const action: 'start' | 'stop' | 'restart' = body.action ?? 'start';
    const executionId: string = body.executionId ?? '';

    try {
        switch (action) {
            case 'start': {
                if (!executionId) {
                    return NextResponse.json({ error: 'executionId required for start' }, { status: 400 });
                }
                const previewUrl = await PreviewOrchestrator.start(projectId, executionId);
                return NextResponse.json({ projectId, action: 'start', previewUrl });
            }
            case 'stop': {
                await PreviewOrchestrator.stop(projectId);
                return NextResponse.json({ projectId, action: 'stop' });
            }
            case 'restart': {
                const previewUrl = await PreviewOrchestrator.restart(projectId);
                return NextResponse.json({ projectId, action: 'restart', previewUrl });
            }
            default:
                return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
        }
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error({ projectId, action, err }, '[API/runtime] POST failed');
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
