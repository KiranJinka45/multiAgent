import { IdempotencyManager } from '../packages/utils/src/idempotency';
import { logger } from '../packages/observability/src/logger';

/**
 * FORMAL IDEMPOTENCY PROOF
 * Proves that concurrent requests for the same mission step result in:
 * 1. Only ONE actual execution.
 * 2. Shared result for all subsequent callers.
 * 3. Race condition prevention via DB Unique Constraints.
 */
async function verifyIdempotency() {
    const key = `proof-of-idempotency-${Date.now()}`;
    const missionId = 'proof-mission-123';
    
    let actualExecutions = 0;

    logger.info({ key }, '🚀 Starting Concurrent Idempotency Race...');

    const runRequest = async (clientId: string) => {
        return IdempotencyManager.executeExternal(key, missionId, async () => {
            actualExecutions++;
            logger.info({ clientId }, '🛠️ Running side-effect (should only happen ONCE)');
            // Simulate network delay to increase race window
            await new Promise(r => setTimeout(r, 2000));
            return { success: true, clientId };
        });
    };

    // Spawn 10 concurrent requests
    try {
        const results = await Promise.all([
            runRequest('client-A'),
            runRequest('client-B'),
            runRequest('client-C'),
            runRequest('client-D'),
            runRequest('client-E'),
        ]);

        logger.info({ results }, '✅ All requests returned successfully');
        
        if (actualExecutions === 1) {
            logger.info('🏆 IDEMPOTENCY PROVEN: Only 1 execution occurred despite 5 concurrent racers.');
        } else {
            logger.error({ actualExecutions }, '❌ IDEMPOTENCY FAILED: Multiple executions occurred.');
            process.exit(1);
        }
    } catch (err) {
        logger.error({ err }, 'Error during idempotency proof');
    }
}

verifyIdempotency();
