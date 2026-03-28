import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@packages/utils/src/server';

/**
 * GET /api/projects/[id]/preview
 * 
 * Direct redirect route to a project's live preview URL.
 * Useful for opening previews in new tabs or external tools.
 */
export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const { id: projectId } = params;

        // Fetch the project to get the persisted preview URL
        const { data: project, error } = await supabaseAdmin
            .from('projects')
            .select('preview_url')
            .eq('id', projectId)
            .single();

        if (error || !project?.preview_url) {
            return NextResponse.json({
                error: 'Preview not found or project not yet completed'
            }, { status: 404 });
        }

        // Redirect to the external/internal preview URL
        return NextResponse.redirect(project.preview_url);

    } catch (err) {
        console.error('[PreviewRedirect] Error:', err);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
