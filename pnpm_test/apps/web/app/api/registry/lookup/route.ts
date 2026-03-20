import { NextRequest, NextResponse } from 'next/server';
import { PreviewRegistry } from '@registry/previewRegistry';

export async function GET(req: NextRequest) {
    const { searchParams } = new URL(req.url);
    const previewId = searchParams.get('previewId');

    if (!previewId) {
        return NextResponse.json({ error: 'Missing previewId' }, { status: 400 });
    }

    try {
        let reg = await PreviewRegistry.lookupByPreviewId(previewId);
        if (!reg) {
            reg = await PreviewRegistry.get(previewId);
        }

        if (!reg) {
            return NextResponse.json({ error: 'Sandbox not found' }, { status: 404 });
        }

        return NextResponse.json(reg);
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'Unknown registry error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
