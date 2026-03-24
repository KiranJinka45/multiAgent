import { NextRequest, NextResponse } from 'next/server';
import { previewManager } from '@libs/runtime';
import { logger } from '@libs/utils/server';

export async function POST(req: NextRequest) {
    try {
        const { projectId } = await req.json();
        if (!projectId) {
            return NextResponse.json({ error: 'Project ID required' }, { status: 400 });
        }

        console.log(`[API] Triggering preview restart for ${projectId}`);
        // We don't await the full launch if it's long, but we trigger it
        previewManager.restartPreview(projectId).catch(err => {
            logger.error({ projectId, err }, 'Failed to restart preview via API');
        });

        return NextResponse.json({ success: true, message: 'Restart triggered' });
    } catch {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
