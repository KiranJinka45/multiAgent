import { NextRequest, NextResponse } from 'next/server';
import JSZip from 'jszip';
import { projectService } from '@services/project-service';
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs';
import { cookies } from 'next/headers';
import { RateLimiter } from '@config/rate-limiter';
import logger from '@config/logger';
import fs from 'fs-extra';
import path from 'path';

/**
 * GET /api/build/[id]/export
 * Export the generated project files as a ZIP bundle.
 */
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

        // Verify Project Ownership
        const isOwner = await projectService.verifyProjectOwnership(projectId, session.user.id, supabase);
        if (!isOwner) {
            return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
        }

        // Fetch the project to validate status
        const project = await projectService.getProject(projectId, supabase);

        if (!project) {
            return NextResponse.json({ error: 'Project not found' }, { status: 404 });
        }

        // Fetch the generated files - PRIORITIZE Sandbox Filesystem for Fast-Path speed
        let files: { path: string; content: string }[] = [];
        const sandboxDir = path.join(process.cwd(), '.generated-projects', projectId);

        if (await fs.pathExists(sandboxDir)) {
            logger.info({ projectId }, '[Export API] Found sandbox directory. Exporting from filesystem.');
            files = await getFilesFromDir(sandboxDir, sandboxDir);
        } else {
            logger.info({ projectId }, '[Export API] Sandbox not found, fetching from Project Service.');
            const dbFiles = await projectService.getProjectFiles(projectId);
            if (dbFiles) {
                files = dbFiles.map(f => ({ path: f.path, content: f.content || '' }));
            }
        }

        if (!files || files.length === 0) {
            logger.warn({ projectId }, '[Export API] No files found for project. Providing fallback bundle.');
            files = [
                { path: 'package.json', content: '{\n  "name": "multiagent-project",\n  "version": "1.0.0",\n  "private": true,\n  "dependencies": {\n    "next": "14.2.3",\n    "react": "18.3.1",\n    "react-dom": "18.3.1"\n  }\n}' },
                { path: 'app/page.tsx', content: 'export default function Home() { return <div>Project Export Fallback. Re-run build to populate files.</div>; }' },
                { path: 'README.md', content: '# MultiAgent Project\nFiles were not yet persisted. Re-run build.' }
            ];
        }

        // Initialize JSZip
        const zip = new JSZip();

        // 1. Add all project files into the ZIP
        files.forEach((file) => {
            zip.file(file.path, file.content || '');
        });

        // 2. Add metadata.json
        const metadata = {
            projectId: project.id,
            exportedAt: new Date().toISOString(),
            status: project.status
        };
        zip.file('multiagent-metadata.json', JSON.stringify(metadata, null, 2));

        // Generate final ZIP blob
        const zipBuffer = await zip.generateAsync({ type: 'nodebuffer' });

        return new NextResponse(zipBuffer as unknown as BodyInit, {
            status: 200,
            headers: {
                'Content-Type': 'application/zip',
                'Content-Disposition': `attachment; filename="multiagent-build-${projectId}.zip"`,
                'Cache-Control': 'no-store, no-cache, must-revalidate',
            },
        });

    } catch (error) {
        logger.error({ error, projectId: params.id }, 'Export API failed');
        return NextResponse.json({ 
            error: 'Internal Server Error', 
            details: error instanceof Error ? error.message : String(error) 
        }, { status: 500 });
    }
}

async function getFilesFromDir(rootPath: string, currentPath: string): Promise<{ path: string; content: string }[]> {
    const entries = await fs.readdir(currentPath, { withFileTypes: true });
    let files: { path: string; content: string }[] = [];

    for (const entry of entries) {
        const fullPath = path.join(currentPath, entry.name);
        const relativePath = path.relative(rootPath, fullPath);

        // Exclude large or sensitive directories
        if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === '.git' || entry.name === 'dist') {
            continue;
        }

        if (entry.isDirectory()) {
            files = files.concat(await getFilesFromDir(rootPath, fullPath));
        } else {
            const content = await fs.readFile(fullPath, 'utf8');
            files.push({ path: relativePath.replace(/\\/g, '/'), content });
        }
    }
    return files;
}
