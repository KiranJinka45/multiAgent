import logger from '../lib/logger';
import { retryCountTotal } from '../lib/metrics';

export class RetryManager {
    private maxRetries: number;
    private baseDelayMs: number;

    constructor(maxRetries: number = 3, baseDelayMs: number = 2000) {
        this.maxRetries = maxRetries;
        this.baseDelayMs = baseDelayMs;
    }

    async executeWithRetry<T>(
        operation: () => Promise<T>,
        agentName: string,
        context: any
    ): Promise<T> {
        let lastError: any;
        const timeoutMs = 60000; // 60 second timeout per agent execution

        for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
            try {
                if (attempt > 1) {
                    const delay = this.baseDelayMs * Math.pow(2, attempt - 2);
                    logger.warn({ agentName, attempt, delay }, 'Retrying agent execution...');
                    retryCountTotal.inc({ agent_name: agentName });
                    await new Promise(resolve => setTimeout(resolve, delay));
                }

                // Execute with timeout
                return await Promise.race([
                    operation(),
                    new Promise<T>((_, reject) => setTimeout(() => reject(new Error(`Agent execution timed out after ${timeoutMs}ms`)), timeoutMs))
                ]);
            } catch (error) {
                lastError = error;
                logger.error({
                    agentName,
                    attempt,
                    error: error instanceof Error ? error.message : String(error)
                }, 'Agent execution failed');

                if (attempt === this.maxRetries) break;
            }
        }

        throw new Error(`Max retries reached for ${agentName}: ${lastError.message}`);
    }
}
