import { QueueManager } from '../packages/utils/src/index';
import { SecretProvider } from '../packages/config/src/env';
import { v4 as uuidv4 } from 'uuid';

const TEST_QUEUE = 'chaos-certification-queue';

async function startLoad() {
    try {
        await SecretProvider.init(['REDIS_URL']);
        console.log('🔥 [LOAD] Injecting 5 jobs per second...');
        console.log('🔗 [LOAD] Redis Sentinel Configuration:', process.env.REDIS_SENTINEL_HOSTS ? 'FOUND' : 'MISSING');
        
        let count = 0;
        const interval = setInterval(async () => {
            const id = uuidv4();
            try {
                // Ensure we use a unique jobId for idempotency testing
                await QueueManager.add(TEST_QUEUE, { 
                    id, 
                    timestamp: Date.now(),
                    scenario: 'REDIS_FAILOVER'
                }, { 
                    jobId: id,
                    removeOnComplete: true 
                });
                count++;
                if (count % 25 === 0) console.log(`🚀 Injected ${count} jobs total...`);
            } catch (e: any) {
                console.error(`❌ [LOAD] Injection failed: ${e.message}`);
                if (e.message.includes('getTenantId')) {
                    console.error('CRITICAL: Observability import failure detected. Check server.ts');
                }
            }
        }, 200);
    } catch (err: any) {
        console.error('❌ [LOAD] Initialization failed:', err.message);
    }
}

startLoad().catch(console.error);
