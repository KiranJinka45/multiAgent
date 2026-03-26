import { execSync } from 'child_process';
import { logger } from '@libs/utils';

export function commitAndPush(featureName: string) {
  const branchName = `feat/autonomous-${featureName.toLowerCase().replace(/\s+/g, '-')}`;
  
  logger.info({ branchName }, 'Executing Git automation...');
  
  try {
    execSync(`git checkout -b ${branchName}`);
    execSync('git add .');
    execSync(`git commit -m "feat(autonomous): ${featureName}"`);
    logger.info('Changes committed successfully.');
  } catch (error) {
    logger.error({ error }, 'Git automation failed.');
  }
}
