import Redis from 'ioredis';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');

async function check() {
    const keys = await redis.keys('build:state:*');
    console.log('--- Active Build States ---');
    for (const key of keys) {
        const val = await redis.get(key);
        console.log(`${key}: ${val}`);
    }
    
    const registryKeys = await redis.keys('runtime:registry:*');
    console.log('\n--- Preview Registry ---');
    for (const key of registryKeys) {
        const val = await redis.get(key);
        console.log(`${key}: ${val}`);
    }
    process.exit(0);
}

check().catch(console.error);
