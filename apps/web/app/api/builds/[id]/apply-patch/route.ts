import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@libs/utils';
import { projectMemory } from '@libs/utils';
import { previewManager } from '@libs/runtime/preview-manager';
import logger from '@libs/utils';

export const dynamic = 'force-dynamic';

/**
 * POST /api/projects/[id]/apply-patch
 *
 * Lightweight file content writer — used by the DiffViewer "Apply" feature.
 * Unlike /edit (which calls ChatEditAgent), this directly persists the supplied
 * content to Supabase and records the edit in ProjectMemory.
 *
 * Body: { path: string, content: string, action: 'create' | 'modify' | 'delete' }
 */
export async function POST(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    const projectId = params.id;

    let body: { path?: string; content?: string; action?: string };
    try {
        body = await req.json();
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
    }

    const { path, content, action = 'modify' } = body;
    if (!path) {
        return NextResponse.json({ error: 'Missing path' }, { status: 400 });
    }

    try {
        if (action === 'delete') {
            const { error } = await supabaseAdmin
                .from('project_files')
                .delete()
                .eq('project_id', projectId)
                .eq('path', path);
            if (error) throw error;
        } else {
            // Upsert: check if the file already exists
            const { data: existing } = await supabaseAdmin
                .from('project_files')
                .select('id')
                .eq('project_id', projectId)
                .eq('path', path)
                .single();

            if (existing) {
                const { error } = await supabaseAdmin
                    .from('project_files')
                    .update({ content: content ?? '', updated_at: new Date().toISOString() })
                    .eq('id', existing.id);
                if (error) throw error;
            } else {
                const ext = path.split('.').pop() || 'txt';
                const { error } = await supabaseAdmin
                    .from('project_files')
                    .insert({
                        project_id: projectId,
                        path,
                        content: content ?? '',
                        language: ext,
                    });
                if (error) throw error;
            }
        }

        // Record the edit in project memory (non-blocking failure)
        try {
            await projectMemory.recordEdit(
                projectId,
                path,
                (action === 'delete' ? 'delete' : action === 'create' ? 'create' : 'modify') as 'create' | 'modify' | 'delete',
                'DiffViewer',
                'Applied diff suggestion from DiffViewer',
                content
            );
        } catch { /* non-fatal */ }

        // Sync to Preview Sandbox (Hot Reload)
        if (action !== 'delete') {
            try {
                await previewManager.streamFileUpdate(projectId, path, content ?? '');
            } catch (err) {
                logger.warn({ projectId, path, err }, '[ApplyPatch] Sandbox sync failed - sandbox might be offline');
            }
        }

        return NextResponse.json({ success: true, path });
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Internal server error';
        return NextResponse.json({ error: message }, { status: 500 });
    }
}
