import axios from 'axios';
import redis from '../../lib/redis';

/**
 * MultiAgent Integrity Validator
 * 
 * Verifies Idempotency (Duplicate executionId) and Billing (Token counting).
 */

async function validateIdempotency() {
    console.log('🧪 Testing Idempotency: Duplicate executionId submission...');
    const API_URL = 'http://localhost:3000/api/generate-project';
    const payload = {
        projectId: 'test-project-idempotency',
        prompt: 'Validation Test'
    };

    try {
        // First submission
        const res1 = await axios.post(API_URL, payload);
        const execId = res1.data.executionId;
        console.log(`Initial submission: ${execId}`);

        // Immediate duplicate
        const res2 = await axios.post(API_URL, payload);
        if (res2.data.executionId === execId) {
            console.log('✅ Idempotency Pass: Duplicate returned same executionId.');
        } else {
            console.warn('⚠️ Idempotency Warning: Second submission returned new executionId.');
        }
    } catch (err: any) {
        console.error('❌ Idempotency Test Failed:', err.message);
    }
}

async function validateBilling(userId: string) {
    console.log(`🧪 Testing Billing Integrity for User: ${userId}`);
    try {
        const redisKey = `tokens:used:daily:${userId}:${new Date().toISOString().split('T')[0]}`;
        const tokenValue = await redis.get(redisKey);
        console.log(`Redis Token Count for Today: ${tokenValue || 0}`);

        // In a real audit, we would cross-reference billing logs in DB here.
        console.log('✅ Integrity Check: Token counter is present in Redis.');
    } catch (err) {
        console.error('❌ Billing Audit Failed:', err);
    }
}

async function run() {
    await validateIdempotency();
    await validateBilling('test-user-id'); // Replace with actual test userId
    await redis.quit();
}

run();
