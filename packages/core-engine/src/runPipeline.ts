import { planner, uiAgent, logicAgent, PolishAgent } from '@packages/agents';
import { validator } from '@packages/validator';
import { healer } from '@packages/auto-healer';
import { run as sandboxRun } from '@packages/sandbox';
import { logger, missionController } from '@packages/utils/src/server';

export const runPipeline = async (missionId: string, prompt: string) => {
  logger.info({ missionId, prompt }, '[Pipeline] Starting execution');
  
  const log = async (message: string, stage: string) => {
    logger.info({ missionId, stage }, `[Pipeline] ${message}`);
    await missionController.addLog(missionId, stage, message);
  };

  try {
    await missionController.updateMission(missionId, { status: 'planning' });
    await log('Analyzing prompt and planning architecture...', 'planning');

    // 1. Planning
    const plan = await planner(prompt);
    await log(`Plan created: ${plan.projectName} (${plan.template})`, 'planning');

    await missionController.updateMission(missionId, { status: 'generating' });
    await log('Generating application code (UI + Logic)...', 'generating');

    // 2. Parallel generation
    const [uiFiles, logicFiles] = await Promise.all([
      uiAgent(plan),
      logicAgent(plan),
    ]);

    let files = { ...uiFiles, ...logicFiles };
    await log(`Generated ${Object.keys(files).length} base files`, 'generating');

    // 3. UI Polish Phase (NEW)
    await log('Applying premium UI polish and responsiveness...', 'generating');
    try {
        const polishAgent = new PolishAgent();
        const polishResponse = await polishAgent.execute({ 
            prompt, 
            context: { executionId: missionId, metadata: {} } as any,
            params: { files: Object.entries(files).map(([path, content]) => ({ path, content })) }
        }) as any;
        
        if (polishResponse.success && polishResponse.data) {
            const polishedFiles: Record<string, string> = {};
            (polishResponse.data.modifiedFiles as any[]).forEach((f: any) => { 
                polishedFiles[f.path] = f.content; 
            });
            files = { ...files, ...polishedFiles };
            await log(`UI Polish complete: ${polishResponse.data.summary}`, 'generating');
        }
    } catch (err) {
        await log('UI Polish skipped: ' + (err as Error).message, 'generating');
    }

    // 4. Validation + healing loop
    await missionController.updateMission(missionId, { status: 'validating' });
    let currentFiles = files;
    for (let i = 0; i < 3; i++) {
      await log(`Validating build (attempt ${i + 1}/3)...`, 'validating');
      const result = await (validator as any)(currentFiles);
      if (result.valid) break;

      await log(`Validation failed: ${result.errors[0]?.message || 'Unknown error'}. Healing...`, 'validating');
      currentFiles = await (healer as any)(result.errors, currentFiles);
    }

    await missionController.updateMission(missionId, { status: 'deploying' });
    await log('Preparing sandbox and deploying container...', 'deploying');

    // 5. Build & run
    const url = await sandboxRun(missionId, currentFiles);
    
    await missionController.updateMission(missionId, { 
        status: 'ready',
        metadata: { url }
    });
    
    await log(`Application live at ${url}`, 'deploying');
    logger.info({ missionId, url }, '[Pipeline] Success');
    
    return { url };
  } catch (error: any) {
    logger.error({ missionId, error: error.message }, '[Pipeline] CRITICAL FAILURE');
    await missionController.setFailed(missionId, error.message);
    throw error;
  }
};
