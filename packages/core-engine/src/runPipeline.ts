import { eventBus, planner, uiAgent, logicAgent, PolishAgent, healer, validator, missionController } from '@packages/utils';
import { previewManager } from '@packages/sandbox-runtime';
import { logger } from '@packages/observability';
import { SafetyGuard } from './services/safety-guard';

export const runPipeline = async (missionId: string, prompt: string) => {
  logger.info({ missionId, prompt }, '[Pipeline] Starting execution');
  
  // Phase 8: Safety Audit
  await SafetyGuard.auditPrompt(prompt);
  
  const log = async (message: string, stage: string) => {
    logger.info({ missionId, stage }, `[Pipeline] ${message}`);
    await missionController.addLog(missionId, stage, message);
  };

  try {
    const pipelineTimer = await eventBus.startTimer(missionId, 'orchestrator', 'total_pipeline', 'Full Pipeline Execution');

    // 1. Planning
    const planningTimer = await eventBus.startTimer(missionId, 'orchestrator', 'planning_phase', 'Analyzing prompt and planning architecture');
    await missionController.updateMission(missionId, { status: 'planning' });
    await log('Analyzing prompt and planning architecture...', 'planning');

    const plan = await planner(prompt);
    await log(`Plan created: ${plan.projectName} (${plan.template})`, 'planning');
    await planningTimer();

    // 2. Parallel generation
    const generationTimer = await eventBus.startTimer(missionId, 'orchestrator', 'generation_phase', 'Generating application code');
    await missionController.updateMission(missionId, { status: 'generating' });
    await log('Generating application code (UI + Logic)...', 'generating');

    const [uiFiles, logicFiles] = await Promise.all([
      uiAgent(plan),
      logicAgent(plan),
    ]);

    let files = { ...uiFiles, ...logicFiles };
    await log(`Generated ${Object.keys(files).length} base files`, 'generating');

    // 3. UI Polish Phase (NEW)
    const polishTimer = await eventBus.startTimer(missionId, 'agent', 'polish_phase', 'Applying premium UI polish');
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
            await polishTimer('Success');
        } else {
            await polishTimer('Failed');
        }
    } catch (err) {
        await log('UI Polish skipped: ' + (err as Error).message, 'generating');
        await polishTimer('Skipped');
    }
    await generationTimer();

    // 4. Validation + healing loop
    const validationTimer = await eventBus.startTimer(missionId, 'orchestrator', 'validation_phase', 'Validating build and healing');
    await missionController.updateMission(missionId, { status: 'validating' });
    let currentFiles = files;
    for (let i = 0; i < 3; i++) {
      await log(`Validating build (attempt ${i + 1}/3)...`, 'validating');
      const result = await (validator as any)(currentFiles);
      if (result.valid) break;

      await log(`Validation failed: ${result.errors[0]?.message || 'Unknown error'}. Healing...`, 'validating');
      currentFiles = await (healer as any)(result.errors, currentFiles);
    }
    await validationTimer();

    // 5. Build & run
    const deployTimer = await eventBus.startTimer(missionId, 'runner', 'deploy_phase', 'Preparing sandbox and deploying');
    await missionController.updateMission(missionId, { status: 'deploying' });
    await log('Preparing sandbox and deploying container...', 'deploying');

    // Real Sandbox Deployment
    const url = await previewManager.launchPreview(missionId);
    
    await missionController.updateMission(missionId, { 
        status: 'ready',
        metadata: { url }
    });
    
    await log(`Application live at ${url}`, 'deploying');
    await deployTimer();
    
    await pipelineTimer('Success');
    logger.info({ missionId, url }, '[Pipeline] Success');
    
    return { url };
  } catch (error: any) {
    logger.error({ missionId, error: error.message }, '[Pipeline] CRITICAL FAILURE');
    await missionController.setFailed(missionId, error.message);
    throw error;
  }
};
