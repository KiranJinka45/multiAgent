import Redis from 'ioredis';

const redis = new Redis('redis://localhost:6379', {
    connectTimeout: 2000,
    maxRetriesPerRequest: 0
});

redis.on('error', (err) => {
    console.error('Redis connection failed:', err.message);
    process.exit(1);
});

redis.ping().then((res) => {
    console.log('Redis PING response:', res);
    process.exit(0);
}).catch((err) => {
    console.error('Redis connection failed:', err.message);
    process.exit(1);
});
