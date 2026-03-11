import { NextRequest, NextResponse } from 'next/server';
import { missionController } from '@/services/mission-controller';
import logger from '@/config/logger';

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
