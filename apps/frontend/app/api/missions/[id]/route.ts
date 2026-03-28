import { NextRequest, NextResponse } from 'next/server';
import { missionController, logger } from '@packages/utils/src/server';

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const missionId = params.id;
    
    try {
        const mission = await missionController.getMission(missionId);
        
        if (!mission) {
            return NextResponse.json({ error: 'Mission not found' }, { status: 404 });
        }

        return NextResponse.json(mission);
    } catch (error) {
        logger.error({ missionId, error }, 'Failed to fetch mission status');
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}

export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const missionId = params.id;
    
    try {
        await missionController.triggerDeployment(missionId);
        return NextResponse.json({ success: true, message: 'Deployment triggered' });
    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        logger.error({ missionId, error: errorMessage }, 'Failed to trigger deployment');
        return NextResponse.json({ error: errorMessage }, { status: 500 });
    }
}
