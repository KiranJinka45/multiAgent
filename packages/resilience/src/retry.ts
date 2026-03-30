import { logger } from '@packages/utils';

export async function retry<T>(
  fn: () => Promise<T>,
  retries: number = 3,
  baseDelayMs: number = 1000
): Promise<T> {
  let attempt = 0;
  while (attempt < retries) {
    try {
      return await fn();
    } catch (err: any) {
      attempt++;
      if (attempt >= retries) {
        logger.error(`Exhausted all ${retries} retries.`);
        throw err;
      }
      const delay = baseDelayMs * Math.pow(2, attempt - 1); // exponential backoff
      logger.warn(`Execution failed: ${err.message}. Retrying in ${delay}ms... (Attempt ${attempt}/${retries})`);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
  throw new Error('Unreachable code in retry logic');
}
