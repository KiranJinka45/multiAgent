import { NextRequest, NextResponse } from 'next/server';
import { PreviewOrchestrator } from '@runtime/previewOrchestrator';
import { RuntimeMetrics } from '@runtime/runtimeMetrics';
import { ProcessManager } from '@runtime/processManager';
import logger from '@configs/logger';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/runtime-stats
 *
 * Returns aggregated runtime platform statistics for the admin dashboard:
 * - All active runtimes (status, URL, port, PID)
 * - Global crash/start counts
 * - Per-project metrics snapshot
 */
export async function GET(_req: NextRequest) {
    try {
        const [allRuntimes, globalStats, processes] = await Promise.all([
            PreviewOrchestrator.listAll(),
            RuntimeMetrics.getGlobalStats(),
            Promise.resolve(ProcessManager.listAll()),
        ]);

        const running = allRuntimes.filter(r => r.status === 'RUNNING').length;
        const starting = allRuntimes.filter(r => r.status === 'STARTING').length;
        const failed = allRuntimes.filter(r => r.status === 'FAILED').length;

        return NextResponse.json({
            summary: {
                total: allRuntimes.length,
                running,
                starting,
                failed,
                processCount: processes.length,
                ...globalStats,
            },
            runtimes: allRuntimes,
            processes,
            timestamp: new Date().toISOString(),
        });
    } catch (err) {
        logger.error({ err }, '[AdminAPI] runtime-stats failed');
        return NextResponse.json({ error: 'Failed to fetch runtime stats' }, { status: 500 });
    }
}
