import { db } from '@packages/db';
import { logger } from '@packages/observability';

async function main() {
  try {
    logger.info('Querying triggers on "ZtanLedgerBlock"...');
    const triggers = await db.$queryRawUnsafe(`
      SELECT 
        tgname AS trigger_name,
        proname AS function_name,
        prosrc AS function_source
      FROM pg_trigger
      JOIN pg_class ON pg_class.oid = tgrelid
      JOIN pg_proc ON pg_proc.oid = tgfoid
      WHERE relname = 'ZtanLedgerBlock';
    `);
    console.log('ZtanLedgerBlock Triggers:', JSON.stringify(triggers, null, 2));

    logger.info('Querying triggers on "ZtanWalLog"...');
    const walTriggers = await db.$queryRawUnsafe(`
      SELECT 
        tgname AS trigger_name,
        proname AS function_name,
        prosrc AS function_source
      FROM pg_trigger
      JOIN pg_class ON pg_class.oid = tgrelid
      JOIN pg_proc ON pg_proc.oid = tgfoid
      WHERE relname = 'ZtanWalLog';
    `);
    console.log('ZtanWalLog Triggers:', JSON.stringify(walTriggers, null, 2));

  } catch (err) {
    console.error('Failed to query triggers:', err);
  } finally {
    await db.$disconnect();
  }
}

main();
