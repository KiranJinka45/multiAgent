import fs from 'fs-extra';
import path from 'path';
import { PortManager, ContainerManager } from '@apps/sandbox-runtime';
import { logger } from '@packages/observability';
import { VITE_BOILERPLATE } from './template';

const PROJECTS_ROOT = path.join(process.cwd(), '.generated-projects');

export const run = async (missionId: string, files: Record<string, string>) => {
  logger.info({ missionId }, '[Sandbox] Starting application run...');

  const projectDir = path.join(PROJECTS_ROOT, missionId);
  await fs.ensureDir(projectDir);

  // 1. Merge Template + AI Files
  const mergedFiles = { ...VITE_BOILERPLATE, ...files };

  // 2. Write files (skip package.json to preserve pre-built node_modules context)
  for (const [filePath, content] of Object.entries(mergedFiles)) {
    if (filePath === 'package.json') continue; 
    
    const fullPath = path.join(projectDir, filePath);
    await fs.ensureDir(path.dirname(fullPath));
    await fs.writeFile(fullPath, content);
  }

  // 2. Acquire port
  const [port] = await PortManager.acquirePorts(missionId, 1);

  // 3. Start container
  try {
    const { containerId } = await ContainerManager.start(missionId, port);
    logger.info({ missionId, containerId, port }, '[Sandbox] Container started, waiting for health check...');
    
    // 4. Health check
    const url = `http://localhost:${port}`;
    const healthy = await waitForHttp(url, 30_000); // 30s timeout
    
    if (!healthy) {
        throw new Error(`Sandbox health check failed for ${url}`);
    }

    logger.info({ missionId, url }, '[Sandbox] Health check passed');
    return url;
  } catch (error) {
    logger.error({ missionId, error }, '[Sandbox] Failed to start container or health check failed');
    throw error;
  }
};

async function waitForHttp(url: string, timeoutMs: number): Promise<boolean> {
    const start = Date.now();
    while (Date.now() - start < timeoutMs) {
        try {
            const resp = await fetch(url);
            if (resp.ok) return true;
        } catch {
            // Ignore connection errors during startup
        }
        await new Promise(resolve => setTimeout(resolve, 2000));
    }
    return false;
}
