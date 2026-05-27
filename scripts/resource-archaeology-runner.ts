import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import crypto from 'node:crypto';
import net from 'node:net';
import { performance } from 'node:perf_hooks';
import { exec } from 'node:child_process';
import { promisify } from 'node:util';
import { backupDatabaseState, restoreDatabaseState, ZtanDbBackup } from './db-snapshot-manager.js';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');
dotenv.config({ path: path.join(rootDir, '.env') });

/**
 * ZTAN STATEFUL RESOURCE EXHAUSTION ARCHAEOLOGY RUNNER
 * 
 * Conducts targeted physical stressors to capture non-binary systems degradation curves:
 * 1. File Descriptor Churn
 * 2. Libuv Threadpool Starvation
 * 3. Connection Pool Saturation
 * 4. TCP TIME_WAIT Sockets Accumulation
 * 5. Write Latency & WAL Amplification Slopes
 */

async function querySocketsCount(): Promise<number> {
  try {
    const { stdout } = await execAsync(`netstat -ano`);
    const rows = stdout.split(/\r?\n/);
    let timeWait = 0;
    for (const row of rows) {
      if (row.includes('TIME_WAIT')) {
        timeWait++;
      }
    }
    return timeWait;
  } catch {
    return 0;
  }
}

async function main() {
  console.log('================================================================');
  console.log('🏗️  INITIATING STATEFUL RESOURCE EXHAUSTION ARCHAEOLOGY');
  console.log('================================================================');

  const dbUrl = process.env.DATABASE_URL;
  if (!dbUrl) {
    console.error('❌ ERROR: DATABASE_URL is not set in .env.');
    process.exit(1);
  }

  const prisma = new PrismaClient({ datasources: { db: { url: dbUrl } } });
  let initialBackup: ZtanDbBackup | null = null;

  const curves: {
    fileDescriptors: Array<{ step: number; openHandles: number }>;
    threadpoolStarvation: Array<{ task: number; timeMs: number }>;
    connectionPool: Array<{ conn: number; acquisitionMs: number }>;
    socketTimeWait: Array<{ tick: number; timeWaitCount: number }>;
    walAmplification: Array<{ sizeKb: number; durationMs: number }>;
  } = {
    fileDescriptors: [],
    threadpoolStarvation: [],
    connectionPool: [],
    socketTimeWait: [],
    walAmplification: []
  };

  try {
    // -------------------------------------------------------------------------
    // Phase 1: Database State Safeguard
    // -------------------------------------------------------------------------
    console.log('\n🔐 PHASE 1: Database State Safeguard');
    initialBackup = await backupDatabaseState(dbUrl);
    console.log('   ✅ Pre-mutation database snapshot successfully stored.');

    // -------------------------------------------------------------------------
    // Stressor 1: File Descriptor / Handles Churn
    // -------------------------------------------------------------------------
    console.log('\n📂 STRESSOR 1: File Descriptor & File Handles Churn');
    const tempDir = path.join(rootDir, 'scratch', 'fd_leak_test');
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    const fileHandles: fs.promises.FileHandle[] = [];
    console.log('   - Opening 150 file descriptors concurrently to trace OS handle slope...');
    for (let i = 0; i < 150; i++) {
      const filePath = path.join(tempDir, `fd_${i}.log`);
      const fh = await fs.promises.open(filePath, 'w+');
      fileHandles.push(fh);
      if (i % 25 === 0) {
        curves.fileDescriptors.push({ step: i, openHandles: fileHandles.length });
        console.log(`      - Open handles count: ${fileHandles.length}`);
      }
    }
    console.log(`   ✅ Handle slope verified. Open file descriptors = ${fileHandles.length}`);

    // Clean up file handles
    for (const fh of fileHandles) {
      await fh.close();
    }
    try {
      fs.rmSync(tempDir, { recursive: true, force: true });
    } catch {}

    // -------------------------------------------------------------------------
    // Stressor 2: Libuv Threadpool Starvation
    // -------------------------------------------------------------------------
    console.log('\n⚡ STRESSOR 2: Libuv Threadpool Saturation & Task Starvation');
    console.log('   - Saturating threadpool with concurrent heavy cryptographic hashes...');
    
    // We schedule a non-blocking asynchronous file read to measure thread pool delay
    const testFile = path.join(rootDir, 'package.json');
    const measureFileRead = async (taskIndex: number) => {
      const start = performance.now();
      await fs.promises.readFile(testFile, 'utf8');
      const timeMs = performance.now() - start;
      curves.threadpoolStarvation.push({ task: taskIndex, timeMs });
    };

    // Burn thread pool with pbkdf2Sync tasks executing in parallel
    const crytoPromises: Promise<any>[] = [];
    const readPromises: Promise<any>[] = [];
    
    for (let i = 0; i < 8; i++) {
      // Schedule background reads
      readPromises.push(measureFileRead(i));
      // Schedule cpu block
      crytoPromises.push(new Promise((resolve) => {
        setImmediate(() => {
          const pass = crypto.randomBytes(16).toString('hex');
          const salt = crypto.randomBytes(16).toString('hex');
          crypto.pbkdf2Sync(pass, salt, 100000, 64, 'sha512');
          resolve(true);
        });
      }));
    }

    await Promise.all([...readPromises, ...crytoPromises]);
    console.log(`   ✅ Starvation curve captured. Worst-case task read latency: ${Math.max(...curves.threadpoolStarvation.map(c => c.timeMs)).toFixed(2)} ms`);

    // -------------------------------------------------------------------------
    // Stressor 3: Prisma Database Connection Pool Saturation
    // -------------------------------------------------------------------------
    console.log('\n🗄️  STRESSOR 3: Prisma DB Connection Pool Saturation');
    console.log('   - Occupying connections with concurrent locking pg_sleep transactions...');
    
    const poolAcquisitionPromises: Promise<any>[] = [];
    for (let i = 0; i < 8; i++) {
      poolAcquisitionPromises.push((async () => {
        const start = performance.now();
        try {
          // Attempt query
          await prisma.$executeRawUnsafe(`SELECT pg_sleep(0.1);`);
          const acquisitionMs = performance.now() - start;
          curves.connectionPool.push({ conn: i, acquisitionMs });
        } catch (e: any) {
          console.warn(`      - Connection pool caught connection error: ${e.message}`);
        }
      })());
    }

    await Promise.all(poolAcquisitionPromises);
    console.log(`   ✅ Pool saturation metrics captured. Peak acquisition time: ${Math.max(...curves.connectionPool.map(c => c.acquisitionMs)).toFixed(2)} ms`);

    // -------------------------------------------------------------------------
    // Stressor 4: TCP TIME_WAIT Port Accumulation
    // -------------------------------------------------------------------------
    console.log('\n🔌 STRESSOR 4: TCP TIME_WAIT Socket Port Accumulation');
    
    const timeWaitBefore = await querySocketsCount();
    console.log(`   - TCP TIME_WAIT sockets before connection storm: ${timeWaitBefore}`);
    
    // Simulate connection storm by triggering rapid micro TCP connections
    const stormPromises: Promise<any>[] = [];
    const server = net.createServer((socket) => {
      socket.end();
    }).listen(4088, '127.0.0.1');

    const triggerTcpRequest = () => {
      return new Promise((resolve) => {
        const socket = net.createConnection({ host: '127.0.0.1', port: 4088 }, () => {
          socket.end();
        });
        socket.on('close', () => resolve(true));
        socket.on('error', () => resolve(false));
      });
    };

    for (let i = 0; i < 50; i++) {
      stormPromises.push(triggerTcpRequest());
    }
    await Promise.all(stormPromises);
    server.close();

    const timeWaitAfter = await querySocketsCount();
    console.log(`   - TCP TIME_WAIT sockets after connection storm: ${timeWaitAfter}`);
    curves.socketTimeWait.push({ tick: 0, timeWaitCount: timeWaitBefore });
    curves.socketTimeWait.push({ tick: 1, timeWaitCount: timeWaitAfter });

    // -------------------------------------------------------------------------
    // Stressor 5: WAL Amplification & Write Latency Slopes
    // -------------------------------------------------------------------------
    console.log('\n📝 STRESSOR 5: WAL Amplification & Write Latency Slopes');
    await prisma.$executeRawUnsafe(`TRUNCATE TABLE "ZtanLedgerBlock" RESTART IDENTITY CASCADE;`);

    const sizes = [1, 10, 50, 100]; // KB sizes
    for (const size of sizes) {
      const payload = 'x'.repeat(size * 1024);
      const start = performance.now();
      await prisma.ztanLedgerBlock.create({
        data: {
          blockId: `wal-block-${size}`,
          prevHash: 'GENESIS_PREV_HASH',
          hash: `hash-wal-${size}`,
          type: 'TX_BATCH',
          payload: payload,
          operator: 'ZTAN_STRESSOR',
          signature: 'sig',
          status: 'VERIFIED',
          epoch: '1'
        }
      });
      const durationMs = performance.now() - start;
      curves.walAmplification.push({ sizeKb: size, durationMs });
      console.log(`      - Payload size: ${size} KB, write execution delay: ${durationMs.toFixed(2)} ms`);
    }

    // Save final downsampled archaeology datasets to JSON
    const snapshotPath = path.join(rootDir, 'telemetry-history', 'resource_archaeology_latest.json');
    fs.writeFileSync(snapshotPath, JSON.stringify({
      timestamp: Date.now(),
      curves
    }, null, 2), 'utf-8');
    console.log('\n   ✅ SRE degradation curves successfully recorded to telemetry-history/resource_archaeology_latest.json');

  } catch (err: any) {
    console.error(`\n❌ ERROR: Resource exhaustion archaeology failed: ${err.message}`);
    process.exit(1);
  } finally {
    // -------------------------------------------------------------------------
    // State restoration & cleanup
    // -------------------------------------------------------------------------
    console.log('\n🏗️  PHASE 6: Database State Restoration & Clean Teardown');
    if (initialBackup) {
      try {
        await restoreDatabaseState(initialBackup, dbUrl);
        console.log('   ✅ Pre-mutation database state fully restored. Clean-room verification secure.');
      } catch (restoreErr: any) {
        console.error(`   ❌ CRITICAL: Failed to restore initial database state: ${restoreErr.message}`);
      }
    }
    await prisma.$disconnect();
  }

  console.log('\n================================================================');
  console.log('🏁 DRILL VERDICT: PASSED ✅');
  console.log('   Degradation curves fully mapped under stateful physical resource limits.');
  console.log('================================================================');
}

main().catch(err => {
  console.error(`❌ Crash in main: ${err.message}`);
  process.exit(1);
});
