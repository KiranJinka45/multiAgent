import { ChatEditAgent } from '@packages/agents';
import { run as sandboxRun } from '@packages/sandbox';
import { ContainerManager } from '@packages/sandbox-runtime';
import { logger, missionController } from '@packages/utils/server';
import fs from 'fs-extra';
import path from 'path';

const PROJECTS_ROOT = path.join(process.cwd(), '.generated-projects');

export const updatePipeline = async (missionId: string, updatePrompt: string) => {
  logger.info({ missionId, updatePrompt }, '[UpdatePipeline] Starting iterative update');
  
  const log = async (message: string, stage: string) => {
    logger.info({ missionId, stage }, `[UpdatePipeline] ${message}`);
    await missionController.addLog(missionId, stage, message);
  };

  try {
    // 1. Get existing project
    const projectDir = path.join(PROJECTS_ROOT, missionId);
    if (!fs.existsSync(projectDir)) {
      throw new Error('Original project files not found for update');
    }

    await missionController.updateMission(missionId, { status: 'planning' });
    await log('Analyzing update prompt against existing codebase...', 'planning');

    // 2. Fetch current files
    const fileContents: Record<string, string> = {};
    const readFilesRecursive = (dir: string, baseRelativePath = '') => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        const relativePath = path.posix.join(baseRelativePath, entry.name);
        if (entry.isDirectory()) {
          if (entry.name === 'node_modules' || entry.name === '.git') continue;
          readFilesRecursive(fullPath, relativePath);
        } else {
          fileContents[relativePath] = fs.readFileSync(fullPath, 'utf-8');
        }
      }
    };
    readFilesRecursive(projectDir);

    // 3. Generate Delta via ChatEditAgent
    await missionController.updateMission(missionId, { status: 'generating' });
    await log('Consulting ChatEditAgent for surgical patches...', 'generating');
    
    const editAgent = new ChatEditAgent();
    const currentFiles = Object.entries(fileContents).map(([path, content]) => ({ path, content }));
    
    const response = await editAgent.execute({
      prompt: updatePrompt, // This matches AgentRequest.prompt
      context: { executionId: missionId, metadata: {} } as any,
      params: {
        editRequest: updatePrompt,
        projectContext: 'Vite + React + Tailwind Sandbox',
        currentFiles,
        techStack: { framework: 'Vite/React', styling: 'Tailwind', backend: 'None', database: 'None' }
      }
    } as any);

    if (!response.success || !response.data) {
      throw new Error(`Agent failed to generate updates: ${response.error}`);
    }

    const { patches } = response.data;
    await log(`Generated ${patches.length} patches`, 'generating');

    // 4. Update files on disk
    for (const patch of patches) {
      if (patch.action === 'delete') {
        const fullPath = path.join(projectDir, patch.path);
        if (fs.existsSync(fullPath)) await fs.remove(fullPath);
      } else {
        const fullPath = path.join(projectDir, patch.path);
        await fs.ensureDir(path.dirname(fullPath));
        await fs.writeFile(fullPath, patch.content);
      }
    }

    // 5. Hot Inject into Container
    await missionController.updateMission(missionId, { status: 'deploying' });
    await log('Hot injecting changes into running sandbox...', 'deploying');
    
    // We assume the container name follows the ma-preview-{missionId} pattern
    const name = `ma-preview-${missionId.slice(0, 12)}`;
    await ContainerManager.hotInject(name, projectDir);

    await missionController.updateMission(missionId, { status: 'ready' });
    await log('Hot update complete. Preview refreshed.', 'deploying');

    return { success: true };
  } catch (error: any) {
    logger.error({ missionId, error: error.message }, '[UpdatePipeline] Iterative update failed');
    await missionController.addLog(missionId, 'error', `Hot update failed: ${error.message}`);
    throw error;
  }
};
