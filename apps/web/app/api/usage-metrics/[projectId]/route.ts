import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@libs/utils/server';

export const dynamic = 'force-dynamic';

export async function GET(
    _req: NextRequest,
    { params }: { params: { projectId: string } }
) {
    const { projectId } = params;

    if (!projectId) {
        return NextResponse.json({ error: 'Missing projectId' }, { status: 400 });
    }

    try {
        const { data, error } = await supabaseAdmin
            .from('builds')
            .select('id, tokens_used, duration_ms, cost_usd, created_at, status')
            .eq('project_id', projectId)
            .order('created_at', { ascending: true })
            .limit(20);

        if (error) {
            // Graceful fallback if column doesn't exist yet
            if (error.message.includes('does not exist') || error.message.includes('schema cache')) {
                return NextResponse.json([], { status: 200 });
            }
            throw error;
        }

        return NextResponse.json(data ?? [], { status: 200 });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Internal server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
