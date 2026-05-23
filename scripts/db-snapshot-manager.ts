/**
 * ZTAN — Immutable Database Snapshot Recovery Manager
 * 
 * Takes in-memory backups of ZTAN core ledger and WAL tables before mutation,
 * and restores them post-run to prevent database corruption cascades.
 */

import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(rootDir, '.env') });

export interface ZtanDbBackup {
  blocks: any[];
  walLogs: any[];
  snapshots: any[];
}

/**
 * Creates an in-memory backup of ZTAN core tables.
 */
export async function backupDatabaseState(dbUrl?: string): Promise<ZtanDbBackup> {
  const url = dbUrl || process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set.');
  }

  const prisma = new PrismaClient({ datasources: { db: { url } } });
  try {
    console.log(`[Backup] Backing up ZTAN tables pre-mutation...`);
    const blocks = await prisma.ztanLedgerBlock.findMany({ orderBy: { id: 'asc' } });
    const walLogs = await prisma.ztanWalLog.findMany({ orderBy: { id: 'asc' } });
    const snapshots = await prisma.ztanSnapshot.findMany({ orderBy: { epoch: 'asc' } });

    console.log(`[Backup] Cached ${blocks.length} blocks, ${walLogs.length} WAL logs, and ${snapshots.length} snapshots in memory.`);
    return { blocks, walLogs, snapshots };
  } catch (err: any) {
    console.error(`[Backup] Error during database state backup: ${err.message}`);
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}

/**
 * Restores ZTAN tables from a cached in-memory backup.
 */
export async function restoreDatabaseState(backup: ZtanDbBackup, dbUrl?: string): Promise<void> {
  const url = dbUrl || process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not set.');
  }

  console.log(`[Restore] Restoring database to pre-mutation snapshot...`);
  const prisma = new PrismaClient({ datasources: { db: { url } } });
  
  try {
    // 1. Truncate all tables using cascade
    console.log('[Restore] Truncating active ZTAN tables...');
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "ZtanLedgerBlock" RESTART IDENTITY CASCADE;`);
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "ZtanWalLog" RESTART IDENTITY CASCADE;`);
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "ZtanSnapshot" RESTART IDENTITY CASCADE;`);

    // 2. Restore ZtanLedgerBlocks
    if (backup.blocks.length > 0) {
      console.log(`[Restore] Restoring ${backup.blocks.length} blocks...`);
      for (const block of backup.blocks) {
        await prisma.$executeRawUnsafe(`
          INSERT INTO "ZtanLedgerBlock" (id, "blockId", "prevHash", hash, type, payload, operator, signature, status, epoch, "createdAt")
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11::timestamp);
        `, 
          block.id, block.blockId, block.prevHash, block.hash, block.type, block.payload, 
          block.operator, block.signature, block.status, block.epoch, block.createdAt
        );
      }
      
      // Reset block ID sequence
      await prisma.$executeRawUnsafe(`
        SELECT setval(pg_get_serial_sequence('"ZtanLedgerBlock"', 'id'), COALESCE(MAX(id), 1)) FROM "ZtanLedgerBlock";
      `);
    }

    // 3. Restore ZtanWalLogs
    if (backup.walLogs.length > 0) {
      console.log(`[Restore] Restoring ${backup.walLogs.length} WAL logs...`);
      for (const log of backup.walLogs) {
        await prisma.$executeRawUnsafe(`
          INSERT INTO "ZtanWalLog" (id, seq, type, payload, status, "createdAt")
          VALUES ($1, $2, $3, $4, $5, $6::timestamp);
        `,
          log.id, log.seq, log.type, log.payload, log.status, log.createdAt
        );
      }

      // Reset WAL log ID sequence
      await prisma.$executeRawUnsafe(`
        SELECT setval(pg_get_serial_sequence('"ZtanWalLog"', 'id'), COALESCE(MAX(id), 1)) FROM "ZtanWalLog";
      `);
    }

    // 4. Restore ZtanSnapshots
    if (backup.snapshots.length > 0) {
      console.log(`[Restore] Restoring ${backup.snapshots.length} snapshots...`);
      for (const snap of backup.snapshots) {
        await prisma.$executeRawUnsafe(`
          INSERT INTO "ZtanSnapshot" (id, epoch, "lastSeq", "lastHash", "stateData", "createdAt")
          VALUES ($1, $2, $3, $4, $5, $6::timestamp);
        `,
          snap.id, snap.epoch, snap.lastSeq, snap.lastHash, snap.stateData, snap.createdAt
        );
      }
    }

    console.log(`[Restore] Database state successfully restored to pre-mutation snapshot.`);
  } catch (err: any) {
    console.error(`[Restore] Error during database state restore: ${err.message}`);
    throw err;
  } finally {
    await prisma.$disconnect();
  }
}
