import { db } from '@packages/db';
import * as os from 'os';

async function test() {
  const leaseId = 'singleton-lease-partition-0';
  const rows = await db.$queryRawUnsafe(`
    SELECT id, generation, owner_pid as "ownerPid", owner_host as "ownerHost", heartbeat
    FROM "ZtanActiveLease"
    WHERE id = $1
  `, leaseId) as any[];

  console.log('Rows:', rows);
  if (rows.length > 0) {
    const row = rows[0];
    console.log('Type of heartbeat:', typeof row.heartbeat, row.heartbeat instanceof Date);
    console.log('Raw heartbeat:', row.heartbeat);
    console.log('heartbeat.getTime():', new Date(row.heartbeat).getTime());
    console.log('Date.now():', Date.now());
    console.log('Difference (ms):', Date.now() - new Date(row.heartbeat).getTime());
  }
}

test().catch(console.error).finally(() => process.exit(0));
