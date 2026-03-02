import logger from '../lib/logger';
import { retryCountTotal } from '../lib/metrics';

export class RetryManager {
    private maxRetries: number;
    private baseDelayMs: number;

    constructor(maxRetries: number = 2, baseDelayMs: number = 2000) {
        this.maxRetries = maxRetries;
        this.baseDelayMs = baseDelayMs;
    }

    async executeWithRetry<T>(
        operation: () => Promise<T>,
        agentName: string,
        _context: any
    ): Promise<T> {
        let lastError: unknown;
        const timeoutMs = 60000;

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                if (attempt > 1) {
                    const delay = this.baseDelayMs * Math.pow(2, (attempt - 2));
                    logger.warn({ agentName, attempt, delay }, 'Retrying agent execution...');
                    retryCountTotal.inc({ agent_name: agentName });
                    await new Promise(resolve => setTimeout(resolve, delay));
                }

                return await Promise.race([
                    operation(),
                    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Agent execution timed out after ${timeoutMs}ms`)), timeoutMs))
                ]);
            } catch (error: unknown) {
                lastError = error;
                const errorMessage = error instanceof Error ? error.message : String(error);
                logger.error({
                    agentName,
                    attempt,
                    error: errorMessage
                }, 'Agent execution failed');

                if (error && typeof error === 'object' && 'isFatal' in error && (error as any).isFatal) {
                    logger.error({ agentName }, 'Fatal error detected. Aborting retries.');
                    break;
                }

                if (attempt === this.maxRetries) break;
            }
        }

        const finalErrorMessage = lastError instanceof Error ? lastError.message : String(lastError);
        throw new Error(`Max retries reached for ${agentName}: ${finalErrorMessage}`);
    }
}
