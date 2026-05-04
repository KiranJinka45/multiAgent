import { db } from '@packages/db';
import { redis, eventBus, queueManager, QUEUE_FREE } from '@packages/utils';
import { logger } from '@packages/observability';
import axios from 'axios';

/**
 * Platform Pulse
 * 
 * Production-grade health verification for the MultiAgent Cluster.
 * Checks all vital subsystems and performs a loopback test.
 */
async function pulse() {
  console.log('💓 MultiAgent Platform Pulse: V17.2');
  console.log('====================================');

  const stats = {
    database: 'down',
    redis: 'down',
    api: 'down',
    workerFleet: 0,
    errors: [] as string[]
  };

  // 1. Database Health
  try {
    await db.$connect();
    await db.user.count();
    stats.database = 'healthy';
    console.log('✅ Database: Connection stable');
  } catch (err: any) {
    stats.errors.push(`DB_FAIL: ${err.message}`);
    console.log('❌ Database: Connection failed');
  }

  // 2. Redis Health
  try {
    const ping = await redis.ping();
    if (ping === 'PONG') {
        stats.redis = 'healthy';
        console.log('✅ Redis: Connection stable');
    }
  } catch (err: any) {
    stats.errors.push(`REDIS_FAIL: ${err.message}`);
    console.log('❌ Redis: Connection failed');
  }

  // 3. API Health
  try {
    const res = await axios.get('http://localhost:3001/api/system/status', { timeout: 2000 });
    if (res.data.status === 'operational') {
        stats.api = 'healthy';
        console.log('✅ API: Gateway responding (v17.2-direct)');
    }
  } catch (err: any) {
    stats.errors.push(`API_FAIL: ${err.message}`);
    console.log('❌ API: Gateway unreachable');
  }

  // 4. Worker Fleet
  try {
    const workerKeys = await redis.keys('worker:heartbeat:*');
    stats.workerFleet = workerKeys.length;
    console.log(`✅ Workers: ${stats.workerFleet} active nodes detected`);
  } catch (err: any) {
     console.log('⚠️ Workers: Could not determine fleet size');
  }

  console.log('\n--- Final Verdict ---');
  if (stats.errors.length === 0 && stats.workerFleet > 0) {
    console.log('🚀 SYSTEM READY FOR PRODUCTION LOAD');
    process.exit(0);
  } else {
    console.log('🚨 SYSTEM UNSTABLE: Checks failed');
    console.log(stats.errors);
    process.exit(1);
  }
}

pulse().catch(err => {
    console.error('CRITICAL PULSE FAILURE:', err);
    process.exit(1);
});
