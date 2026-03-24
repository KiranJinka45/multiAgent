import { exec } from 'child_process';
import { promisify } from 'util';
import path from 'path';
import fs from 'fs-extra';
import { logger } from '@libs/utils';

const execAsync = promisify(exec);

export class VercelDeployer {
    private token: string;
    private teamId?: string;

    constructor() {
        this.token = process.env.VERCEL_TOKEN || '';
        this.teamId = process.env.VERCEL_TEAM_ID;
        
        if (!this.token) {
            logger.warn('[VercelDeployer] VERCEL_TOKEN is not set. Deployment will fail.');
        }
    }

    async deploy(projectId: string, sandboxDir: string): Promise<string> {
        logger.info({ projectId, sandboxDir }, '[VercelDeployer] Initiating Vercel deployment');

        // Ensure vercel.json exists or create a default one if needed
        const vercelConfigPath = path.join(sandboxDir, 'vercel.json');
        if (!fs.existsSync(vercelConfigPath)) {
            const defaultConfig = {
                version: 2,
                name: `multiagent-${projectId}`,
                rewrites: [{ "source": "/(.*)", "destination": "/" }]
            };
            await fs.writeJson(vercelConfigPath, defaultConfig, { spaces: 2 });
        }

        try {
            // --yes to skip prompts, --token for auth
            let command = `npx vercel deploy "${sandboxDir}" --token ${this.token} --yes --prod`;
            if (this.teamId) {
                command += ` --scope ${this.teamId}`;
            }

            logger.debug({ command: command.replace(this.token, 'REDACTED') }, '[VercelDeployer] Running deploy command');
            
            const { stdout, stderr } = await execAsync(command);
            
            if (stderr && !stdout) {
                throw new Error(`Vercel CLI Error: ${stderr}`);
            }

            // Vercel CLI outputs the URL to stdout
            const url = stdout.trim();
            if (!url.startsWith('http')) {
                // Sometimes it might include other text, let's try to extract the last line if it's a URL
                const lines = url.split('\n');
                const lastLine = lines[lines.length - 1].trim();
                if (lastLine.startsWith('https://')) return lastLine;
            }

            return url;
        } catch (err: unknown) {
            const error = err as Error & { stderr?: string };
            logger.error({ error: error.message, stderr: error.stderr }, '[VercelDeployer] Process error');
            throw new Error(`Deployment failed: ${error.message}`);
        }
    }
}
