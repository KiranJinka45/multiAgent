import * as dotenv from 'dotenv';
import * as dotenvExpand from 'dotenv-expand';
import * as fs from 'node:fs';
import * as path from 'node:path';

// Load environment variables from workspace root
const rootEnv = path.resolve(process.cwd(), '.env');
if (fs.existsSync(rootEnv)) {
  const envConfig = dotenv.config({ path: rootEnv });
  dotenvExpand.expand(envConfig);
}

import { db } from '@packages/db';
import { logger } from '@packages/observability';

async function main() {
  logger.info('[ImmutabilityTriggers] Starting application of database-level immutability triggers...');

  try {
    // 1. Create the enforce_immutability PL/pgSQL function
    logger.info('[ImmutabilityTriggers] Creating trigger function enforce_immutability...');
    await db.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION enforce_immutability()
      RETURNS TRIGGER AS $$
      BEGIN
          -- 1. Check for administrative bypass token
          IF current_setting('ztan.bypass_immutability', true) = 'on' THEN
              IF TG_OP = 'DELETE' THEN
                  RETURN OLD;
              ELSE
                  RETURN NEW;
              END IF;
          END IF;

          -- 2. Allow normal WAL log state transition from PENDING to COMMITTED
          IF TG_TABLE_NAME = 'ZtanWalLog' AND TG_OP = 'UPDATE' THEN
              IF OLD.status = 'PENDING' AND NEW.status = 'COMMITTED' THEN
                  RETURN NEW;
              END IF;
          END IF;

          -- 3. Allow normal ZtanSnapshot updates/overwrites
          IF TG_TABLE_NAME = 'ZtanSnapshot' AND TG_OP = 'UPDATE' THEN
              RETURN NEW;
          END IF;

          RAISE EXCEPTION 'ZTAN Safety Violation: Ledger records are strictly append-only. Modification is forbidden.';
      END;
      $$ LANGUAGE plpgsql;
    `);

    // 2. Bind triggers to ZtanLedgerBlock table
    logger.info('[ImmutabilityTriggers] Binding trigger to ZtanLedgerBlock table...');
    // Drop both possible names to be absolutely robust
    await db.$executeRawUnsafe('DROP TRIGGER IF EXISTS trg_ledger_block_no_mutation ON "ZtanLedgerBlock";');
    await db.$executeRawUnsafe('DROP TRIGGER IF EXISTS trg_ledger_no_mutation ON "ZtanLedgerBlock";');
    await db.$executeRawUnsafe(`
      CREATE TRIGGER trg_ledger_no_mutation
      BEFORE UPDATE OR DELETE ON "ZtanLedgerBlock"
      FOR EACH ROW EXECUTE FUNCTION enforce_immutability();
    `);

    // 3. Bind triggers to ZtanWalLog table
    logger.info('[ImmutabilityTriggers] Binding trigger to ZtanWalLog table...');
    await db.$executeRawUnsafe('DROP TRIGGER IF EXISTS trg_wal_log_no_mutation ON "ZtanWalLog";');
    await db.$executeRawUnsafe(`
      CREATE TRIGGER trg_wal_log_no_mutation
      BEFORE UPDATE OR DELETE ON "ZtanWalLog"
      FOR EACH ROW EXECUTE FUNCTION enforce_immutability();
    `);

    // 4. Bind triggers to ZtanSnapshot table
    logger.info('[ImmutabilityTriggers] Binding trigger to ZtanSnapshot table...');
    await db.$executeRawUnsafe('DROP TRIGGER IF EXISTS trg_snapshot_no_mutation ON "ZtanSnapshot";');
    await db.$executeRawUnsafe(`
      CREATE TRIGGER trg_snapshot_no_mutation
      BEFORE UPDATE OR DELETE ON "ZtanSnapshot"
      FOR EACH ROW EXECUTE FUNCTION enforce_immutability();
    `);

    logger.info('[ImmutabilityTriggers] All immutability triggers successfully applied!');

    // 5. Verification Ceremony
    logger.info('[ImmutabilityTriggers] Commencing verification ceremony...');

    // Create a temporary test block
    const testBlockId = 'TEST-BLOCK-999';
    logger.info(`[ImmutabilityTriggers] Inserting test block ${testBlockId}...`);
    
    // Temporarily drop trigger to allow clean insert if block already exists
    await db.$executeRawUnsafe('DROP TRIGGER IF EXISTS trg_ledger_no_mutation ON "ZtanLedgerBlock";');
    await db.ztanLedgerBlock.deleteMany({ where: { blockId: testBlockId } });
    
    // Recreate trigger before inserting or testing mutation
    await db.$executeRawUnsafe(`
      CREATE TRIGGER trg_ledger_no_mutation
      BEFORE UPDATE OR DELETE ON "ZtanLedgerBlock"
      FOR EACH ROW EXECUTE FUNCTION enforce_immutability();
    `);

    await db.ztanLedgerBlock.create({
      data: {
        blockId: testBlockId,
        prevHash: '0x000',
        hash: '0x123',
        type: 'GOVERNANCE',
        payload: '{"test":true}',
        operator: 'TEST-OPERATOR',
        signature: 'TEST-SIG',
        status: 'VERIFIED',
        epoch: '999'
      }
    });

    // Test UPDATE exception
    logger.info('[ImmutabilityTriggers] Testing UPDATE prevention...');
    let updateFailed = false;
    try {
      await db.ztanLedgerBlock.update({
        where: { blockId: testBlockId },
        data: { payload: '{"tampered":true}' }
      });
    } catch (err: any) {
      updateFailed = true;
      logger.info(`[ImmutabilityTriggers] UPDATE successfully blocked with error: ${err.message}`);
    }

    if (!updateFailed) {
      throw new Error('Verification Failed: UPDATE on ZtanLedgerBlock was NOT blocked by trigger!');
    }

    // Test DELETE exception
    logger.info('[ImmutabilityTriggers] Testing DELETE prevention...');
    let deleteFailed = false;
    try {
      await db.ztanLedgerBlock.delete({
        where: { blockId: testBlockId }
      });
    } catch (err: any) {
      deleteFailed = true;
      logger.info(`[ImmutabilityTriggers] DELETE successfully blocked with error: ${err.message}`);
    }

    if (!deleteFailed) {
      throw new Error('Verification Failed: DELETE on ZtanLedgerBlock was NOT blocked by trigger!');
    }

    // Cleanup: Drop trigger temporarily to delete test block, then restore it
    logger.info('[ImmutabilityTriggers] Cleaning up test block...');
    await db.$executeRawUnsafe('DROP TRIGGER IF EXISTS trg_ledger_no_mutation ON "ZtanLedgerBlock";');
    await db.ztanLedgerBlock.deleteMany({ where: { blockId: testBlockId } });
    await db.$executeRawUnsafe(`
      CREATE TRIGGER trg_ledger_no_mutation
      BEFORE UPDATE OR DELETE ON "ZtanLedgerBlock"
      FOR EACH ROW EXECUTE FUNCTION enforce_immutability();
    `);

    logger.info('[ImmutabilityTriggers] Verification Ceremony passed perfectly! Immutability triggers are strictly operating.');
  } catch (err: any) {
    logger.error({ err }, '[ImmutabilityTriggers] Immutability triggers application failed');
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();
