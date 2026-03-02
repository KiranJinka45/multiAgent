import { NextRequest, NextResponse } from 'next/server';
import { ContainerManager } from '@/runtime/containerManager';
import { PreviewRegistry } from '@/runtime/previewRegistry';
import logger from '@/lib/logger';

export const dynamic = 'force-dynamic';

/**
 * GET  /api/admin/containers                      → List all managed containers + stats
 * POST /api/admin/containers  { action, projectId } → Control containers
 *
 * Actions: 'logs', 'stats', 'restart', 'stop', 'cleanup-all', 'prune-images'
 */
export async function GET(_req: NextRequest) {
    try {
        const containers = ContainerManager.listAll();
        const registryRecords = await PreviewRegistry.listAll();

        // Enrich with live Docker stats for running containers
        const enriched = await Promise.all(
            containers.map(async (c) => {
                const record = registryRecords.find(r => r.projectId === c.projectId);
                const dockerRunning = ContainerManager.isRunning(c.projectId);
                const stats = dockerRunning ? ContainerManager.getStats(c.projectId) : null;

                return {
                    ...c,
                    registryStatus: record?.status ?? 'UNKNOWN',
                    dockerRunning,
                    resourceUsage: stats,
                };
            })
        );

        return NextResponse.json({
            count: enriched.length,
            containers: enriched,
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        logger.error({ err }, '[AdminAPI] container list failed');
        return NextResponse.json({ error: 'Failed to list containers' }, { status: 500 });
    }
}

export async function POST(req: NextRequest) {
    const body = await req.json().catch(() => ({}));
    const { action, projectId } = body;

    try {
        switch (action) {
            case 'logs': {
                if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });
                const lines = parseInt(body.lines ?? '100', 10);
                const logs = ContainerManager.getLogs(projectId, lines);
                return NextResponse.json({ projectId, logs });
            }

            case 'stats': {
                if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });
                const stats = ContainerManager.getStats(projectId);
                return NextResponse.json({ projectId, stats });
            }

            case 'restart': {
                if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });
                await ContainerManager.restart(projectId);
                return NextResponse.json({ projectId, action: 'restart', success: true });
            }

            case 'stop': {
                if (!projectId) return NextResponse.json({ error: 'projectId required' }, { status: 400 });
                await ContainerManager.stop(projectId);
                return NextResponse.json({ projectId, action: 'stop', success: true });
            }

            case 'cleanup-all': {
                await ContainerManager.cleanupAll();
                return NextResponse.json({ action: 'cleanup-all', success: true });
            }

            case 'prune-images': {
                await ContainerManager.pruneImages();
                return NextResponse.json({ action: 'prune-images', success: true });
            }

            default:
                return NextResponse.json({ error: `Unknown action: ${action}` }, { status: 400 });
        }
    } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        logger.error({ action, projectId, err }, '[AdminAPI] container action failed');
        return NextResponse.json({ error: msg }, { status: 500 });
    }
}
