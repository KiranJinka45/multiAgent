import { NextRequest, NextResponse } from 'next/server';
import { ChatEditAgent } from '@libs/agents';
import { projectMemory } from '@libs/utils';
import { projectService } from '@libs/utils';
import { sandbox } from '@libs/runtime/sandbox';
import { patchVerifier } from '@libs/utils';
import { supabaseAdmin } from '@libs/utils';
import { VirtualFileSystem, PatchEngine, CommitManager } from '@libs/utils';
import path from 'path';
import fs from 'fs';
import { previewManager } from '@libs/runtime/preview-manager';
import logger from '@libs/utils';

/**
 * POST /api/projects/[id]/edit
 *
 * Full chat editing pipeline with patch verification loop:
 *
 *  1. Load project memory  (tech stack, file manifest, edit history, deps)
 *  2. Build rich context   (file tree + installed packages + previous edits)
 *  3. Identify affected files via ProjectMemory
 *  4. ChatEditAgent generates surgical patches
 *  5. Apply patches to sandbox filesystem
 *  6. PatchVerifier runs tsc --noEmit → RepairAgent on failure (max 2 retries)
 *  7. Sync healed files back to Supabase
 *  8. Record edit in ProjectMemory
 *  9. Return rich response: explanation + patches + buildStatus + previewReloaded
 */

// ── helpers ─────────────────────────────────────────────────────────

function readInstalledPackages(sandboxDir: string): string[] {
    try {
        const pkgPath = path.join(sandboxDir, 'package.json');
        if (!fs.existsSync(pkgPath)) return [];
        const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
        return [
            ...Object.keys(pkg.dependencies || {}),
            ...Object.keys(pkg.devDependencies || {})
        ];
    } catch {
        return [];
    }
}

function buildRichContext(
    memory: { framework: string; styling: string; backend: string; database: string; auth?: string; editHistory?: { action: string; filePath: string; reason: string }[]; features?: string[] },
    allFiles: { path: string; content?: string }[],
    installedPackages: string[]
): string {
    const fileTree = allFiles.map(f => f.path).join('\n  ');
    const recentEdits = (memory.editHistory || [])
        .slice(-8)
        .map((e: { action: string; filePath: string; reason: string }) => `${e.action} ${e.filePath} — ${e.reason}`)
        .join('\n  ');
    const features = (memory.features || []).join(', ') || 'none yet';
    const deps = installedPackages.slice(0, 30).join(', ');

    return `PROJECT CONTEXT
================
Framework    : ${memory.framework}
Styling      : ${memory.styling}
Backend      : ${memory.backend}
Database     : ${memory.database}
Auth         : ${memory.auth}
Features     : ${features}
Total Files  : ${allFiles.length}
Installed Packages: ${deps || 'unknown'}

FILE TREE
---------
  ${fileTree}

RECENT EDITS (last 8)
---------------------
  ${recentEdits || 'none yet'}

INSTRUCTIONS
------------
You are editing an EXISTING project. Do NOT:
- reinstall packages that are already in the package.json
- recreate components that already exist
- change files unrelated to the request
Only modify the minimum set of files required to fulfil the user's request.`;
}

// ── main handler ─────────────────────────────────────────────────────

export async function POST(
    request: NextRequest,
    { params }: { params: { id: string } }
) {
    const t0 = Date.now();

    try {
        const { id: projectId } = params;
        const body = await request.json();
        const { message } = body;

        if (!message || typeof message !== 'string') {
            return NextResponse.json({ error: 'Missing edit message' }, { status: 400 });
        }

        // ── 1. Load / initialise project memory ──────────────────────
        let memory = await projectMemory.getMemory(projectId);

        const allFiles = await projectService.getProjectFiles(projectId, supabaseAdmin);

        if (!allFiles || allFiles.length === 0) {
            return NextResponse.json(
                { error: 'Project has no files yet. Run a build first.' },
                { status: 404 }
            );
        }

        if (!memory) {
            memory = await projectMemory.initializeMemory(
                projectId,
                { framework: 'nextjs', styling: 'tailwind', backend: 'api-routes', database: 'supabase' },
                allFiles.map(f => ({ path: f.path, content: f.content || '' }))
            );
        }

        // ── 2. Build rich context (file tree + packages + history) ────
        const sandboxDir = path.join(process.cwd(), '.generated-projects', projectId);
        const installedPackages = readInstalledPackages(sandboxDir);
        const richContext = buildRichContext(memory, allFiles, installedPackages);

        // ── 3. Identify targeted files ───────────────────────────────
        const affectedPaths = await projectMemory.getAffectedFiles(memory, message);

        let relevantFiles = allFiles
            .filter(f => affectedPaths.includes(f.path) || affectedPaths.length === 0)
            .slice(0, 15)
            .map(f => ({ path: f.path, content: f.content || '' }));

        // Fallback: include main entry files so the agent always has minimal context
        if (relevantFiles.length === 0) {
            relevantFiles = allFiles
                .filter(f =>
                    f.path.match(/page\.tsx$|layout\.tsx|globals\.css|package\.json|tailwind\.config/)
                )
                .slice(0, 6)
                .map(f => ({ path: f.path, content: f.content || '' }));
        }

        // ── 4. ChatEditAgent generates patches ───────────────────────
        const editAgent = new ChatEditAgent();
        const vfs = new VirtualFileSystem();
        const agentResult = await editAgent.execute({
            editRequest: message,
            projectContext: richContext,
            currentFiles: relevantFiles,
            techStack: {
                framework: (memory.framework || 'nextjs') as string,
                styling: (memory.styling || 'tailwind') as string,
                backend: (memory.backend || 'api-routes') as string,
                database: (memory.database || 'supabase') as string
            }
        }, {
            getVFS: () => vfs,
            getExecutionId: () => '',
            getProjectId: () => projectId,
            get: async () => undefined,
            atomicUpdate: async () => {},
            setAgentResult: async () => {}
        });

        if (!agentResult.success || !agentResult.data?.patches?.length) {
            return NextResponse.json({
                error: 'AI failed to generate patches. Try rephrasing your request.',
                details: agentResult.error
            }, { status: 500 });
        }

        const patches = agentResult.data.patches;

        // ── 5. Apply patches via Virtual File System (VFS) ───────────
        vfs.loadFromDiskState(allFiles.map(f => ({ path: f.path, content: f.content || '' })));

        PatchEngine.applyPatches(vfs, patches);

        const sandboxAvailable = sandbox.exists(projectId);
        if (sandboxAvailable) {
            await CommitManager.commit(vfs, sandboxDir);
        }

        // ── 6. Patch verification loop (tsc → RepairAgent → retry) ──
        let verifyResult = { passed: true, errors: [] as string[], warnings: [] as string[], healed: false, healAttempts: 0 };
        const dirtyFiles = vfs.getDirtyFiles().map(f => ({ path: f.path, content: f.content }));

        if (sandboxAvailable && dirtyFiles.length > 0) {
            verifyResult = await patchVerifier.verify(sandboxDir, vfs);
        }

        // ── 7. Sync final files from sandbox → Supabase ─────────────
        // If healing happened, read updated files from sandbox disk
        const finalPatches = [...patches];
        if (verifyResult.healed && sandboxAvailable) {
            for (const patch of finalPatches) {
                if (patch.action === 'delete') continue;
                try {
                    const diskPath = path.join(sandboxDir, patch.path.replace(/^\//, ''));
                    if (fs.existsSync(diskPath)) {
                        patch.content = fs.readFileSync(diskPath, 'utf8');
                    }
                } catch { /* keep original content */ }
            }
        }

        // Persist to Supabase
        for (const patch of finalPatches) {
            if (patch.action === 'delete') {
                await supabaseAdmin
                    .from('project_files')
                    .delete()
                    .eq('project_id', projectId)
                    .eq('path', patch.path);
            } else {
                const existing = allFiles.find(f => f.path === patch.path);
                if (existing) {
                    await supabaseAdmin
                        .from('project_files')
                        .update({ content: patch.content, updated_at: new Date().toISOString() })
                        .eq('id', existing.id);
                } else {
                    await supabaseAdmin
                        .from('project_files')
                        .insert({
                            project_id: projectId,
                            path: patch.path,
                            content: patch.content,
                            language: patch.path.split('.').pop() || 'txt'
                        });
                }
            }

            // ── 8. Record edit in ProjectMemory ──────────────────────
            await projectMemory.recordEdit(
                projectId,
                patch.path,
                patch.action as 'create' | 'modify' | 'delete',
                'ChatEditAgent',
                patch.reason || message
            );
        }

        // ── 9. Sync to Preview Sandbox (Hot Reload) ─────────────────
        try {
            const finalFiles = finalPatches
                .filter(p => p.action !== 'delete')
                .map(p => ({ path: p.path, content: p.content }));
            
            if (finalFiles.length > 0) {
                for (const file of finalFiles) {
                    await previewManager.streamFileUpdate(projectId, file.path, file.content || '');
                }
            }
        } catch (err) {
            logger.warn({ projectId, err }, '[EditAgent] Sandbox sync failed');
        }

        // Record new features
        if (agentResult.data.newFeatures?.length) {
            for (const feature of agentResult.data.newFeatures) {
                await projectMemory.addFeature(projectId, feature);
            }
        }

        const elapsed = Date.now() - t0;

        // ── 9. Rich response ─────────────────────────────────────────
        return NextResponse.json({
            success: true,
            message: agentResult.data.explanation,
            explanation: agentResult.data.explanation,
            patches: finalPatches.map((p: { path: string; action: string; reason?: string }) => ({
                path: p.path,
                action: p.action,
                type: p.action,       // alias for UI
                reason: p.reason
            })),
            buildStatus: verifyResult.passed
                ? (verifyResult.healed ? 'healed' : 'success')
                : 'warning',
            buildErrors: verifyResult.errors,
            buildWarnings: verifyResult.warnings,
            healAttempts: verifyResult.healAttempts,
            healed: verifyResult.healed,
            previewReloaded: sandboxAvailable,
            newFeatures: agentResult.data.newFeatures,
            tokensUsed: agentResult.tokens,
            elapsedMs: elapsed
        });

    } catch (error) {
        console.error('[ChatEdit] Unhandled error:', error);
        return NextResponse.json({
            error: 'Internal server error',
            details: error instanceof Error ? error.message : String(error)
        }, { status: 500 });
    }
}
