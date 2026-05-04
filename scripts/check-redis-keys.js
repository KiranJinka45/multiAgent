const Redis = require('ioredis');
const redis = new Redis('redis://localhost:6379');

async function check() {
    const keys = await redis.keys('*');
    console.log('Keys:', keys);
    
    const executionId = '8065187';
    const state = await redis.get(`build:state:${executionId}`);
    console.log(`State for ${executionId}:`, state);
    
    const mission = await redis.get(`mission:${executionId}`);
    console.log(`Mission for ${executionId}:`, mission);
    
    process.exit(0);
}

check();
