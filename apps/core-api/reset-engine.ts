import { sreEngine } from './src/services/sre-engine';
import { db } from '@packages/db';
import { redis } from '@packages/utils';

async function reset() {
  console.log('Resetting SRE Engine...');
  sreEngine.reset();
  await db.auditLog.deleteMany({});
  await redis.del('system:mode');
  await redis.del('system:confidence');
  console.log('Reset complete.');
  process.exit(0);
}

reset().catch(err => {
  console.error(err);
  process.exit(1);
});
