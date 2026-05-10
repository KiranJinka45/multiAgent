const { PrismaClient } = require('@prisma/client');
const Redis = require('ioredis');
require('dotenv').config();

async function main() {
    console.log('--- ZTAN TELEMETRY AUDIT (JS) ---');
    const db = new PrismaClient();
    const redis = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379');

    try {
        console.log('[1/3] Fetching Reliability Metrics...');
        const total = await redis.get('reliability:total');
        const successes = await redis.get('reliability:success');
        const ri = total ? (parseInt(successes || '0') / parseInt(total)) * 100 : 0;
        console.log(`- Reliability Index (RI): ${ri.toFixed(2)}%`);

        console.log('[2/3] Analyzing Agent Success Score (ASS)...');
        const taskStats = await db.missionStep.groupBy({
            by: ['status'],
            _count: { _all: true },
        });
        
        const completed = taskStats.find(s => s.status === 'completed')?._count._all || 0;
        const totalTasks = taskStats.reduce((acc, s) => acc + s._count._all, 0);
        const ass = totalTasks ? (completed / totalTasks) * 100 : 0;
        console.log(`- Agent Success Score (ASS): ${ass.toFixed(2)}%`);

        console.log('[3/3] System Health Summary');
        console.log(`- Database: Connected`);
        console.log(`- Redis: Connected`);
        console.log('---------------------------------');

    } catch (err) {
        console.error('Audit failed:', err);
    } finally {
        await db.$disconnect();
        redis.disconnect();
    }
}

main();
