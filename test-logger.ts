import { logger } from './packages/utils/src/index';
console.log('Logger info check:', typeof logger.info === 'function');
console.log('Logger error check:', typeof logger.error === 'function');
