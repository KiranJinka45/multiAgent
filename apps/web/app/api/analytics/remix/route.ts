import { NextResponse } from 'next/server';
import { AnalyticsService } from '@libs/utils';

export async function POST(req: Request) {
    try {
        const { previewId } = await req.json();
        if (!previewId) {
            return NextResponse.json({ error: 'Missing previewId' }, { status: 400 });
        }

        await AnalyticsService.trackRemix(previewId);
        return NextResponse.json({ success: true });
    } catch (error) {
        console.error('[API] Remix analytics failed:', error);
        return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
    }
}
