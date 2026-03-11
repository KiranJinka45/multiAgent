import fs from 'fs-extra';
import path from 'path';
import { AgentContext } from '../types/agent-context';
import logger from '@config/logger';

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

            await context.atomicUpdate(ctx => {
                ctx.files = { ...ctx.files, ...files };
            });

            logger.info({ templateName, fileCount: Object.keys(files).length }, '[TemplateService] Template injected into VFS');
            return true;
        } catch (error) {
            logger.error({ error, templateName }, '[TemplateService] Failed to inject template');
            return false;
        }
    }

    private async readTemplateFiles(basePath: string, currentPath: string, files: Record<string, string>) {
        const entries = await fs.readdir(currentPath, { withFileTypes: true });

        for (const entry of entries) {
            const fullPath = path.join(currentPath, entry.name);
            const relativePath = path.relative(basePath, fullPath).replace(/\\/g, '/');

            if (entry.isDirectory()) {
                await this.readTemplateFiles(basePath, fullPath, files);
            } else {
                const content = await fs.readFile(fullPath, 'utf8');
                files[relativePath] = content;
            }
        }
    }
}

export const templateService = new TemplateService();
