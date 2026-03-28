import { planFeature } from './planner';
import { createFile } from './executor';
import { validateSystem } from './validator';
import { commitAndPush } from './git';
import { logger } from '@packages/utils';

export async function runAutonomousAgent(prompt: string) {
  logger.info('Starting Autonomous Coding Agent workflow...');
  
  const plan = await planFeature(prompt);
  
  // Example realization (MVP)
  await createFile('apps/api-gateway/src/features/autonomous-feature.ts', 
    `export const autonomousFeature = () => console.log("Self-built feature active");`
  );
  
  const isValid = validateSystem();
  
  if (isValid) {
    commitAndPush(prompt.slice(0, 20));
    logger.info('🚀 Autonomous Task Completed Successfully!');
  } else {
    logger.error('❌ Autonomous Task Failed Validation.');
  }
}

export * from './queue-manager';
