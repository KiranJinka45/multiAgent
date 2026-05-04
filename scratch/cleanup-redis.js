const Redis = require('ioredis');
const redis = new Redis();

async function cleanup() {
    console.log("Cleaning up Redis SRE keys...");
    const keys = await redis.keys('SRE_*');
    if (keys.length > 0) {
        await redis.del(...keys);
        console.log(`Deleted keys: ${keys.join(', ')}`);
    }
    const raftKeys = await redis.keys('RAFT_*');
    if (raftKeys.length > 0) {
        await redis.del(...raftKeys);
        console.log(`Deleted keys: ${raftKeys.join(', ')}`);
    }
    process.exit(0);
}

cleanup().catch(err => {
    console.error(err);
    process.exit(1);
});
