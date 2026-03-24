import { SemanticCacheService } from './packages/utils/src/services/semantic-cache';
import { redis } from './packages/utils/src/services/redis/index';

async function testCache() {
    console.log('--- Semantic Cache Test ---');
    const system = 'System prompt';
    const user = 'User prompt';
    const model = 'test-model';
    const response = { data: 'Cached response' };

    console.log('Setting cache...');
    await SemanticCacheService.set(user, response, system, model);

    console.log('Retrieving from cache...');
    const result = await SemanticCacheService.get(user, system, model);
    console.log('Cache result:', result);

    if (JSON.stringify(result) === JSON.stringify(response)) {
        console.log('SUCCESS: Cache hit matches original response');
    } else {
        console.log('FAILED: Cache result mismatch');
    }

    await redis.quit();
}

testCache().catch(console.error);
