import { redis } from './redis';
import crypto from 'crypto';
import logger from '../logger';

export interface ErrorSolution {
    explanation: string;
    missingDependencies: string[];
    patches: Array<{
        path: string;
        anchor?: string;
        content: string;
    }>;
}

export class ErrorKnowledgeBase {
    private static PREFIX = 'error_kb:';

    /**
     * Normalizes and hashes an error message for lookup.
     */
    private static hashError(error: string): string {
        // Normalize: remove variable parts like line numbers, paths, hashes, or timestamps
        const normalized = error
            .replace(/\/.*?\/MultiAgent\//g, 'PROJECT_ROOT/') // Strip private paths
            .replace(/:\d+:\d+/g, ':LINE:COL') // Strip line/col
            .replace(/0x[0-9a-fA-F]+/g, 'HEX_VAL') // Strip memory addresses
            .replace(/[a-f0-9]{8,}/g, 'HASH_VAL') // Strip build hashes/UUIDs
            .replace(/\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}.\d{3}Z/g, 'TIMESTAMP') // Strip ISO timestamps
            .trim();
        
        return crypto.createHash('md4').update(normalized).digest('hex');
    }

    /**
     * Fetches a cached solution for a given error message.
     */
    static async getSolution(error: string): Promise<ErrorSolution | null> {
        try {
            const hash = this.hashError(error);
            const cached = await redis.get(`${this.PREFIX}${hash}`);
            
            if (cached) {
                logger.info({ hash }, '[ErrorKB] Cache hit for error');
                return JSON.parse(cached);
            }
            return null;
        } catch (err) {
            logger.warn({ err }, '[ErrorKB] Failed to fetch solution from cache');
            return null;
        }
    }

    /**
     * Records a successful solution for an error.
     */
    static async recordSolution(error: string, solution: ErrorSolution) {
        try {
            const hash = this.hashError(error);
            // TTL of 24 hours for knowledge items
            await redis.set(`${this.PREFIX}${hash}`, JSON.stringify(solution), 'EX', 86400);
            logger.info({ hash }, '[ErrorKB] Recorded new solution for error');
        } catch (err) {
            logger.error({ err }, '[ErrorKB] Failed to record solution');
        }
    }
}
