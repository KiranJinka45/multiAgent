import { db } from '@packages/db';

async function main() {
  console.log('[DB-REAPER] Terminating all other active PostgreSQL backend processes...');
  try {
    const terminated = (await db.$queryRawUnsafe(`
      SELECT pg_terminate_backend(pid), query, state
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND pid <> pg_backend_pid();
    `)) as any[];
    console.log(`[DB-REAPER] Terminated connections. Count: ${terminated.length}`);
    console.log(terminated);
  } catch (err: any) {
    console.error('[DB-REAPER] Error terminating connections:', err.message || err);
  } finally {
    await db.$disconnect();
    process.exit(0);
  }
}

main();
