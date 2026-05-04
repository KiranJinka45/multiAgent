import 'dotenv/config';
import Redis from 'ioredis';

async function check() {
    console.log('Connecting to:', process.env.REDIS_URL || 'redis://127.0.0.1:6379');
    const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
        maxRetriesPerRequest: 1,
        connectTimeout: 5000
    });

    redis.on('error', (err) => console.error('Redis Error:', err.message));
    redis.on('connect', () => console.log('Redis Connected!'));
    
    try {
        await redis.ping();
        console.log('PING successful!');
    } catch (err) {
        console.error('PING failed:', err.message);
    } finally {
        await redis.quit();
    }
}

check();
