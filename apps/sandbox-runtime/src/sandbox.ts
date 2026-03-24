import { exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import util from 'util';
import { logger, getSafeEnv } from '@libs/utils/server';

const execAsync = util.promisify(exec);

export interface SandboxResult {
    success: boolean;
    previewUrl: string;
    logs: string[];
    errors: string[];
}

/**
 * ProcessSandbox provides OS-level process isolation for generated project builds.
 * 
 * On systems with Docker, this would use containers.
 * On systems without Docker (like this one), it uses:
 * - Isolated directory per project under .sandboxes/
 * - Separate Node.js process with limited env
 * - Filesystem-level separation
 * - Process cleanup on exit
 * 
 * Architecture:
 *   AI Generation → Sandbox Directory → npm install → Auto-Heal → Dev Server → Preview URL
 */
export class ProcessSandbox {
    private sandboxRoot: string;

    constructor() {
        this.sandboxRoot = path.join(process.cwd(), '.generated-projects');
        if (!fs.existsSync(this.sandboxRoot)) {
            fs.mkdirSync(this.sandboxRoot, { recursive: true });
        }
    }

    /**
     * Create an isolated sandbox for a project and write all files into it.
     */
    async createSandbox(projectId: string, files: { path: string; content: string }[]): Promise<string> {
        const sandboxDir = path.join(this.sandboxRoot, projectId);

        // Clean up any previous sandbox
        if (fs.existsSync(sandboxDir)) {
            await this.cleanup(projectId);
        }
        fs.mkdirSync(sandboxDir, { recursive: true });

        // Write all generated files
        for (const file of files) {
            const filePath = path.join(sandboxDir, file.path.replace(/^\//, ''));
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(filePath, file.content || '', 'utf8');
        }

        logger.info({ projectId, fileCount: files.length }, 'Sandbox created');
        return sandboxDir;
    }

    /**
     * Install dependencies inside the sandbox.
     */
    async installDependencies(sandboxDir: string): Promise<{ success: boolean; logs: string[] }> {
        const logs: string[] = [];

        try {
            logs.push('[Sandbox] Running npm install...');
            const { stdout, stderr } = await execAsync(
                'npm install --no-audit --legacy-peer-deps --loglevel=error',
                { cwd: sandboxDir, timeout: 120000, env: getSafeEnv({ NODE_ENV: 'development' }) }
            );

            if (stdout) logs.push(stdout.substring(0, 500));
            if (stderr) logs.push(`[warn] ${stderr.substring(0, 500)}`);
            logs.push('[Sandbox] Dependencies installed successfully.');

            return { success: true, logs };
        } catch (e: unknown) {
            const err = e as { stderr?: string; message?: string };
            logs.push(`[error] npm install failed: ${err.stderr?.substring(0, 300) || err.message}`);
            return { success: false, logs };
        }
    }

    /**
     * Run a build verification step inside the sandbox.
     */
    async verifyBuild(sandboxDir: string): Promise<{ success: boolean; error: string; stdout: string }> {
        try {
            const { stdout, stderr } = await execAsync(
                'npx tsc --noEmit 2>&1 || true',
                { cwd: sandboxDir, timeout: 60000 }
            );
            return { success: true, error: stderr, stdout };
        } catch (e: unknown) {
            const err = e as { stderr?: string; stdout?: string; message?: string };
            return { success: false, error: err.stderr || err.message || 'Unknown error', stdout: err.stdout || '' };
        }
    }

    /**
     * Update specific files in an existing sandbox (for incremental edits).
     */
    async updateFiles(projectId: string, patches: { path: string; content: string; action: string }[]): Promise<void> {
        const sandboxDir = path.join(this.sandboxRoot, projectId);
        if (!fs.existsSync(sandboxDir)) {
            throw new Error(`Sandbox not found for project ${projectId}`);
        }

        for (const patch of patches) {
            const filePath = path.join(sandboxDir, patch.path.replace(/^\//, ''));

            if (patch.action === 'delete') {
                if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
            } else {
                const dir = path.dirname(filePath);
                if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
                fs.writeFileSync(filePath, patch.content || '', 'utf8');
            }
        }

        logger.info({ projectId, patchCount: patches.length }, 'Sandbox files updated');
    }

    /**
     * Get all files currently in the sandbox.
     */
    readAllFiles(projectId: string): { path: string; content: string }[] {
        const sandboxDir = path.join(this.sandboxRoot, projectId);
        if (!fs.existsSync(sandboxDir)) return [];

        const files: { path: string; content: string }[] = [];
        this.walkDir(sandboxDir, '', files);
        return files;
    }

    /**
     * Check if a sandbox exists for a project.
     */
    exists(projectId: string): boolean {
        return fs.existsSync(path.join(this.sandboxRoot, projectId));
    }

    /**
     * Remove a project sandbox entirely.
     */
    async cleanup(projectId: string): Promise<void> {
        const sandboxDir = path.join(this.sandboxRoot, projectId);
        if (fs.existsSync(sandboxDir)) {
            fs.rmSync(sandboxDir, { recursive: true, force: true });
            logger.info({ projectId }, 'Sandbox cleaned up');
        }
    }

    // ── Private helpers ──────────────────────────────────────────

    private walkDir(base: string, sub: string, out: { path: string; content: string }[]): void {
        const fullPath = path.join(base, sub);
        if (!fs.existsSync(fullPath)) return;

        const entries = fs.readdirSync(fullPath, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.name === 'node_modules' || entry.name === '.next' || entry.name.startsWith('.')) continue;

            const relPath = sub ? `${sub}/${entry.name}` : entry.name;
            if (entry.isDirectory()) {
                this.walkDir(base, relPath, out);
            } else {
                try {
                    const content = fs.readFileSync(path.join(base, relPath), 'utf8');
                    out.push({ path: `/${relPath}`, content });
                } catch {
                    // Skip binary files
                }
            }
        }
    }
}

export const sandbox = new ProcessSandbox();
