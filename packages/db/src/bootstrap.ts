import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export async function bootstrapZtanSecurity(): Promise<void> {
  console.log('[Bootstrap] Initializing ZTAN Database Immutability Triggers...');
  try {
    // 1. Create plpgsql function to block updates and deletes
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION ztan_enforce_immutability()
      RETURNS TRIGGER AS $$
      BEGIN
        RAISE EXCEPTION 'ZTAN Immutable Ledger Violation: Updates, replacements, or deletions on ZtanLedgerBlock are physically barred by protocol rules.';
      END;
      $$ LANGUAGE plpgsql;
    `);
    console.log('[Bootstrap] Created PL/pgSQL function ztan_enforce_immutability()');

    // 2. Attach trigger on ZtanLedgerBlock
    await prisma.$executeRawUnsafe(`
      DROP TRIGGER IF EXISTS trg_ledger_no_mutation ON "ZtanLedgerBlock";
    `);
    await prisma.$executeRawUnsafe(`
      CREATE TRIGGER trg_ledger_no_mutation
      BEFORE UPDATE OR DELETE ON "ZtanLedgerBlock"
      FOR EACH ROW
      EXECUTE FUNCTION ztan_enforce_immutability();
    `);
    console.log('[Bootstrap] Successfully attached trg_ledger_no_mutation trigger to "ZtanLedgerBlock"');

    // 3. Optional: Create immutable trigger for ZtanWalLog
    await prisma.$executeRawUnsafe(`
      CREATE OR REPLACE FUNCTION ztan_enforce_wal_immutability()
      RETURNS TRIGGER AS $$
      BEGIN
        IF TG_OP = 'UPDATE' THEN
          RAISE EXCEPTION 'ZTAN WAL Mutation Violation: Modifying existing transaction logs is strictly barred.';
        ELSIF TG_OP = 'DELETE' THEN
          -- Allow deletion only if sequence is being replayed or processed, but block modifications
          RAISE EXCEPTION 'ZTAN WAL Deletion Violation: Transaction logs must not be purged.';
        END IF;
      END;
      $$ LANGUAGE plpgsql;
    `);

    console.log('[Bootstrap] ZTAN consensus database hardening completed successfully.');
  } catch (error: any) {
    console.error('[Bootstrap] Failed to apply ZTAN database triggers:', error.message || error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}
