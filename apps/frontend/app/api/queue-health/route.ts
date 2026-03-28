import { NextResponse } from 'next/server';
import { freeQueue } from '@packages/utils/src/server';

export async function GET() {
    try {
        const [waiting, active, completed, failed, delayed] = await Promise.all([
            freeQueue.getWaitingCount(),
            freeQueue.getActiveCount(),
            freeQueue.getCompletedCount(),
            freeQueue.getFailedCount(),
            freeQueue.getDelayedCount(),
        ]);

        return NextResponse.json({
            queueName: 'build-jobs',
            waiting,
            active,
            completed,
            failed,
            delayed,
            total: waiting + active + completed + failed + delayed,
            timestamp: Date.now()
        });
    } catch (error) {
        return NextResponse.json({ 
            error: 'Failed to fetch queue metrics',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
