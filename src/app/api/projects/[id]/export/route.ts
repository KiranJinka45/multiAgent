import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { projectService } from '@/lib/project-service';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { RateLimiter } from '@/lib/rate-limiter';

export async function GET(
    req: NextRequest,
    { params }: { params: { id: string } }
) {
    try {
        const projectId = params.id;

        if (!projectId) {
            return NextResponse.json({ error: 'Project ID is required' }, { status: 400 });
        }

        const supabase = createRouteHandlerClient({ cookies });
        const { data: { session } } = await supabase.auth.getSession();

        if (!session) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        // Apply Export Rate Limiting (10/hr)
        const rateLimit = await RateLimiter.checkExportLimit(session.user.id);
        if (!rateLimit.allowed) {
            return NextResponse.json({
                error: 'Too many export requests. Please try again later.',
                retryAfter: rateLimit.retryAfter
            }, {
                status: 429,
                headers: { 'Retry-After': (rateLimit.retryAfter || 60).toString() }
            });
        }

        // Verify Project Ownership via unified helper
        const isOwner = await projectService.verifyProjectOwnership(projectId, session.user.id, supabase);
        if (!isOwner) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Fetch the project to validate status
        const project = await projectService.getProject(projectId, supabase);

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        if (project.status !== 'completed') {
            return NextResponse.json({ error: 'Project must be completed to export' }, { status: 400 });
        }

        // Fetch the generated files from the database or DB service
        const files = await projectService.getProjectFiles(projectId);

        if (!files || files.length === 0) {
            return NextResponse.json({ error: 'No files found for this project' }, { status: 404 });
        }

        // Initialize JSZip
        const zip = new JSZip();

        // 1. Add all project files into the ZIP
        files.forEach((file) => {
            // JSZip handles nested folders automatically from paths (e.g. `src/components/App.tsx`)
            zip.file(file.path, file.content || '');
        });

        // 2. Add metadata.json for traceability
        const metadata = {
            projectId: project.id,
            executionId: project.last_execution_id,
            stackConfig: project.description, // Keeping prompt/stack config
            timestamp: new Date().toISOString(),
            status: project.status
        };
        zip.file('metadata.json', JSON.stringify(metadata, null, 2));

        // 3. Generate the ZIP as a buffer
        const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

        // 4. Return as downloadable ZIP stream
        const response = new NextResponse(zipBuffer as unknown as BodyInit, {
            status: 200,
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="project-${projectId}.zip"`,
                'Content-Length': zipBuffer.length.toString(),
            },
        });

        return response;

    } catch (error) {
        console.error('ZIP Export Error:', error);
        return NextResponse.json({
            error: error instanceof Error ? error.message : 'Unknown error during export'
        }, { status: 500 });
    }
}
