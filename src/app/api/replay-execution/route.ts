import { NextRequest, NextResponse } from 'next/server';
import { Orchestrator } from '../../../agents/orchestrator';
import { DistributedExecutionContext as ExecutionContext } from '../../../lib/execution-context';
import redis from '../../../lib/redis';
import logger from '../../../lib/logger';

export async function POST(
    req: NextRequest,
    { params }: { params: { executionId: string } }
) {
    const executionId = params.executionId || req.nextUrl.searchParams.get('executionId');
    if (!executionId) {
        return NextResponse.json({ error: 'Missing executionId' }, { status: 400 });
    }

    try {
        const context = new ExecutionContext(executionId);
        const data = await context.get();

        if (!data) {
            return NextResponse.json({ error: 'Execution not found' }, { status: 404 });
        }

        if (data.status === 'completed') {
            return NextResponse.json({ error: 'Execution already completed' }, { status: 400 });
        }

        logger.info({ executionId }, 'Starting deterministic replay');

        const orchestrator = new Orchestrator();

        // In a real system, we might want to push this to a high-priority queue 
        // instead of running it in the API request. 
        // For infrastructure grade, let's trigger it in the background.

        orchestrator.run(data.prompt, data.userId, data.projectId, executionId)
            .catch(err => logger.error({ err, executionId }, 'Replay failed'));

        return NextResponse.json({
            success: true,
            message: 'Replay initiated',
            executionId
        });

    } catch (error) {
        logger.error({ error, executionId }, 'Failed to initiate replay');
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
