import fs from 'fs-extra';
import path from 'path';
import logger from './logger';

export class TemplateEngine {
    private static TEMPLATES_DIR = path.join(process.cwd(), 'src/templates');

    /**
     * Copies a template to a target directory.
     * This is designed to be extremely fast.
     */
    static async copyTemplate(templateId: string, targetDir: string): Promise<string[]> {
        const sourceDir = path.join(this.TEMPLATES_DIR, templateId);

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
        const files = await this.getFilesRecursive(targetDir);
        logger.info(`Template [${templateId}] applied. ${files.length} files initialized.`);

        return files;
    }

    private static async getFilesRecursive(dir: string, baseDir: string = dir): Promise<string[]> {
        const entries = await fs.readdir(dir, { withFileTypes: true });
        const files = await Promise.all(entries.map((entry) => {
            const res = path.resolve(dir, entry.name);
            return entry.isDirectory() ? this.getFilesRecursive(res, baseDir) : res;
        }));

        return Array.prototype.concat(...files).map(f => path.relative(baseDir, f));
    }

    /**
     * Performs surgical string replacements on a project.
     * Use this for branding, project names, and feature descriptions.
     */
    static async customizeFiles(targetDir: string, replacements: Record<string, string>) {
        const files = await this.getFilesRecursive(targetDir);

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
