import { execSync } from 'child_process';
import { logger } from '@packages/utils';

export function validateSystem() {
  logger.info('Running autonomous validation suite...');
  try {
    execSync('pnpm lint', { stdio: 'inherit' });
    execSync('pnpm build', { stdio: 'inherit' });
    return true;
  } catch (error) {
    logger.error('Validation failed. Triggering Auto-Refactor Self-Healing...');
    try {
      execSync('pnpm refactor', { stdio: 'inherit' });
      // Re-validate after refactor
      execSync('pnpm lint', { stdio: 'inherit' });
      execSync('pnpm build', { stdio: 'inherit' });
      return true;
    } catch (refactorError) {
      logger.error('Self-healing failed to resolve architectural violations.');
      return false;
    }
  }
}
