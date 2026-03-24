import fs from 'fs-extra';
import path from 'path';
import { AgentContext } from '@libs/contracts';
import logger from '../logger';

export class TemplateService {
    private templatesDir = path.join(process.cwd(), 'templates');

    async injectTemplate(templateName: string, context: AgentContext): Promise<boolean> {
        const templatePath = path.join(this.templatesDir, templateName);
        
        if (!await fs.pathExists(templatePath)) {
            logger.warn({ templateName }, '[TemplateService] Template not found');
            return false;
        }

        try {
            const files: Record<string, string> = {};
            await this.readTemplateFiles(templatePath, templatePath, files);

            const vfs = context.getVFS();
            for (const [filePath, content] of Object.entries(files)) {
                vfs.setFile(filePath, content);
            }

            await context.atomicUpdate(() => {});

            logger.info({ templateName, fileCount: Object.keys(files).length }, '[TemplateService] Template injected into VFS');
            return true;
        } catch (error) {
            logger.error({ error, templateName }, '[TemplateService] Failed to inject template');
            return false;
        }
    }

    private async readTemplateFiles(basePath: string, currentPath: string, files: Record<string, string>) {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });
        const EXCLUDED_DIRS = ['node_modules', '.next', '.git', 'dist', '.turbo'];

        for (const entry of entries) {
            const fullPath = path.join(currentPath, entry.name);
            const relativePath = path.relative(basePath, fullPath).replace(/\\/g, '/');

            if (entry.isDirectory()) {
                if (EXCLUDED_DIRS.includes(entry.name)) {
                    continue;
                }
                await this.readTemplateFiles(basePath, fullPath, files);
            } else {
                const content = await fs.readFile(fullPath, 'utf8');
                files[relativePath] = content;
            }
        }
    }
}

export const templateService = new TemplateService();
