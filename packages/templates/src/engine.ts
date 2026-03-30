import * as fs from 'fs-extra';
import path from 'path';
import logger from '@packages/observability';

export class TemplateEngine {
    private static TEMPLATES_DIR = path.join(process.cwd(), 'templates');

    /**
     * Copies a template to a target directory.
     * This is designed to be extremely fast.
     */
    static async copyTemplate(templateId: string, targetDir: string): Promise<string[]> {
        // Map the default ID back to the root of the 'templates' directory
        const mappedId = templateId === 'nextjs-tailwind-basic' ? '.' : templateId;
        const sourceDir = path.join(this.TEMPLATES_DIR, mappedId);

        if (!await fs.pathExists(sourceDir)) {
            throw new Error(`Template [${templateId}] not found in ${sourceDir}`);
        }

        logger.info({ templateId, targetDir }, 'Copying template files...');

        // Ensure target directory exists
        await fs.ensureDir(targetDir);

        // Copy everything from template folder to target
        await fs.copy(sourceDir, targetDir, {
            overwrite: true,
            errorOnExist: false,
        });

        // Get list of copied files for VFS tracking
        const files = await this.getFilesRecursive(targetDir, targetDir);
        logger.info(`Template [${templateId}] applied. ${files.length} files initialized.`);

        return files;
    }

    private static async getFilesRecursive(dir: string, baseDir: string): Promise<string[]> {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        const files = await Promise.all(entries.map(async (entry) => {
            const res = path.join(dir, entry.name);
            return entry.isDirectory() ? this.getFilesRecursive(res, baseDir) : [res];
        }));

        const flattened = files.flat();

        // ONLY apply relative mapping at the entry point of recursion
        if (dir === baseDir) {
            return flattened.map(f => {
                let rel = path.relative(baseDir, f);
                if (path.isAbsolute(rel)) {
                    // Fallback for Windows drive casing issues
                    const normalizedBase = baseDir.replace(/\\/g, '/').toLowerCase();
                    const normalizedF = f.replace(/\\/g, '/').toLowerCase();
                    if (normalizedF.startsWith(normalizedBase)) {
                        rel = f.substring(baseDir.length).replace(/^[\\\/]+/, '');
                    }
                }
                return rel.replace(/\\/g, '/');
            });
        }

        return flattened;
    }

    /**
     * Performs surgical string replacements on a project.
     * Use this for branding, project names, and feature descriptions.
     */
    static async customizeFiles(targetDir: string, replacements: Record<string, string>) {
        const files = await this.getFilesRecursive(targetDir, targetDir);

        for (const file of files) {
            const filePath = path.join(targetDir, file);
            const stats = await fs.stat(filePath);

            if (stats.size > 1024 * 1024) continue; // Skip files > 1MB

            let content = await fs.readFile(filePath, 'utf-8');
            let modified = false;

            for (const [placeholder, value] of Object.entries(replacements)) {
                if (content.includes(placeholder)) {
                    content = content.replace(new RegExp(placeholder, 'g'), value);
                    modified = true;
                }
            }

            if (modified) {
                await fs.writeFile(filePath, content);
            }
        }
    }
}
