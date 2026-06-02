import v8 from 'v8';
import fs from 'fs';
import path from 'path';
import { performance } from 'perf_hooks';
import { scanLedgerMerkleChain } from '../tests/replay-parity-audit.js';
import { PrismaClient } from '@prisma/client';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * ─── Phase 12 Tier E1: Telemetry Archaeologist ─────────────────────────────
 * Tracks V8 memory slopes, event loop lag, and continuous Merkle Parity Snapshots.
 */

const HISTORY_DIR = path.resolve(__dirname, '../telemetry-history');
if (!fs.existsSync(HISTORY_DIR)) {
    fs.mkdirSync(HISTORY_DIR, { recursive: true });
}

const HEAP_CSV_PATH = path.join(HISTORY_DIR, 'heap-slopes.csv');
if (!fs.existsSync(HEAP_CSV_PATH)) {
    fs.writeFileSync(HEAP_CSV_PATH, 'timestamp,heapTotalMB,heapUsedMB,eventLoopLagMs,parityHealthy,brokenLinks\n');
}

const prisma = new PrismaClient();
let running = true;

process.on('SIGINT', () => {
    console.log('\n[Archaeologist] Received SIGINT. Terminating...');
    running = false;
});

async function measureEventLoopLag(): Promise<number> {
    const t0 = performance.now();
    return new Promise(resolve => {
        setTimeout(() => {
            resolve(performance.now() - t0);
        }, 0);
    });
}

async function runArchaeologyLoop(intervalMs: number, maxDurationMs?: number) {
    console.log('================================================================================');
    console.log('📊 ZTAN PHASE 12 TIER E1: TELEMETRY ARCHAEOLOGIST');
    console.log('================================================================================');
    console.log(`[Archaeologist] Starting continuous telemetry probes every ${intervalMs}ms...`);
    
    const startTime = Date.now();
    let iter = 0;

    while (running) {
        if (maxDurationMs && (Date.now() - startTime) >= maxDurationMs) {
            console.log(`[Archaeologist] Maximum bounded duration (${maxDurationMs}ms) reached. Stopping.`);
            break;
        }
        iter++;
        const timestamp = new Date().toISOString();
        
        // Memory Profile
        const stats = v8.getHeapStatistics();
        const heapTotalMB = (stats.total_heap_size / 1024 / 1024).toFixed(2);
        const heapUsedMB = (stats.used_heap_size / 1024 / 1024).toFixed(2);
        
        // Perf Profile
        const eventLoopLagMs = (await measureEventLoopLag()).toFixed(2);
        
        // Cryptographic Parity Audit
        console.log(`\n[Archaeologist] Iteration ${iter}: Triggering Parity Snapshot...`);
        const audit = await scanLedgerMerkleChain(prisma);
        
        console.log(`[Archaeologist] Heap: ${heapUsedMB}MB / ${heapTotalMB}MB | Lag: ${eventLoopLagMs}ms | Parity: ${audit.success ? 'HEALTHY' : 'CORRUPTED'}`);
        
        const row = `${timestamp},${heapTotalMB},${heapUsedMB},${eventLoopLagMs},${audit.success},${audit.brokenLinksCount}\n`;
        fs.appendFileSync(HEAP_CSV_PATH, row);
        
        // Delay for next tick
        await new Promise(resolve => setTimeout(resolve, intervalMs));
    }
    
    await prisma.$disconnect();
    console.log('[Archaeologist] Exited successfully.');
}

// Parse args
const args = process.argv.slice(2);
const testArg = args.includes('--test');
// If --test, run fast (every 2 seconds, for 10 seconds total)
const interval = testArg ? 2000 : 300000; // Default 5 minutes
const maxDuration = testArg ? 10000 : undefined;

runArchaeologyLoop(interval, maxDuration).catch(err => {
    console.error('[Archaeologist] Fatal error:', err);
    process.exit(1);
});
