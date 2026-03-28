import { NextResponse } from 'next/server';
import { missionController } from '@packages/utils/server';

/**
 * GET /api/missions
 * Returns all active missions from Redis.
 */
export async function GET() {
    try {
        const missions = await missionController.listActiveMissions();
        return NextResponse.json({
            count: missions.length,
            missions,
            timestamp: Date.now()
        }, { status: 200 });
    } catch (error) {
        return NextResponse.json({ 
            error: 'Failed to fetch active missions',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}

export const dynamic = 'force-dynamic';
