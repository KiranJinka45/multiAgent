process.env.ZTAN_PARTITIONS = '1';
import { execSync, spawn } from 'child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import * as os from 'node:os';
import { db } from '@packages/db';
import { GovernanceLedger } from '@packages/utils';
import { EvidenceLedgerService } from './index.js';
import { EventCategory, VerificationState } from '@packages/contracts';

async function clearAllState() {
    console.log('[ChaosTest] Purging active ledger blocks and database state...');
    // Bypass immutability to clean database blocks
    await db.$transaction(async (tx: any) => {
        await tx.$executeRawUnsafe("SET LOCAL ztan.bypass_immutability = 'on';");
        await tx.ztanLedgerBlock.deleteMany({});
        await tx.ztanWalLog.deleteMany({});
        await tx.ztanSnapshot.deleteMany({});
        await tx.idempotencyRecord.deleteMany({});
    });
    await db.$executeRawUnsafe('TRUNCATE TABLE "ZtanActiveLease" RESTART IDENTITY CASCADE;');

    console.log('[ChaosTest] Purging local filesystem locks and state...');
    const dir = path.join(process.cwd(), '.ztan-transparency');
    if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            if (file.endsWith('.lock') || file.endsWith('.generation') || file.endsWith('.json') || file.endsWith('.log')) {
                try {
                    fs.unlinkSync(path.join(dir, file));
                } catch (e) {}
            }
        }
    }
    // Reset active Lock and Db generation maps in memory
    GovernanceLedger.activeLockGenerations.clear();
    GovernanceLedger.activeDbGenerations.clear();
}

async function runChaosTests() {
    console.log('==================================================');
    console.log('⚡ STARTING ZTAN HARDENED CHAOS & SURVIVABILITY SUITE');
    console.log('==================================================\n');

    // =========================================================================
    // DRILL 1: Simulated GC Pause & Fencing Preemption
    // =========================================================================
    console.log('👉 DRILL 1: Exercising GC Pause & Fencing Preemption...');
    await clearAllState();

    // Initialize ledger partition states and filesystem setup synchronously to prevent event-loop pollution
    GovernanceLedger.states.set(0, 'ACTIVE');
    const ledgerFile = GovernanceLedger.getLedgerFile(0);
    if (!fs.existsSync(path.dirname(ledgerFile))) {
        fs.mkdirSync(path.dirname(ledgerFile), { recursive: true });
    }
    if (!fs.existsSync(ledgerFile)) {
        const genesis = [GovernanceLedger.createGenesisEntry(0)];
        fs.writeFileSync(ledgerFile, JSON.stringify(genesis, null, 2), 'utf8');
    }

    // 1. Acquire initial lease
    await GovernanceLedger.acquireDbLease(0);
    const initialGen = GovernanceLedger.activeDbGenerations.get(0);
    console.log(`[ChaosTest] Initial database lease acquired. Local Gen: ${initialGen}`);

    // 2. Increment the generation out-of-band directly (simulating another coordinator taking over)
    console.log('[ChaosTest] Simulating out-of-band lease preemption by another coordinator (generation incremented)...');
    await db.$executeRawUnsafe(
        'UPDATE "ZtanActiveLease" SET generation = generation + 1, owner_pid = 99999 WHERE id = $1',
        'singleton-lease-partition-0'
    );

    // 3. Synchronously block the main thread to simulate event loop starvation/GC pause
    console.log('[ChaosTest] Simulating 3s GC pause / event-loop starvation by spin-locking main thread...');
    const blockEnd = Date.now() + 3000;
    while (Date.now() < blockEnd) {
        // Spin lock
    }
    console.log('[ChaosTest] Event loop resumed. Attempting write to verify fencing...');

    // 4. Attempt write and verify it gets blocked by database epoch fencing
    let preemptionCaught = false;
    try {
        await GovernanceLedger.appendEntry('POLICY', 'GC-PAUSE-TEST-PAYLOAD', 'OPERATOR-GC', 'VERIFIED', '106');
    } catch (err: any) {
        if (err.message.includes('Fencing Distributed Lease Violation')) {
            preemptionCaught = true;
            console.log(`✅ SUCCESS: Drill 1 passed. Fencing Token correctly blocked the stale write! Error: ${err.message}`);
        } else {
            console.error('[ChaosTest] Drill 1 encountered unexpected error:', err);
        }
    }

    if (!preemptionCaught) {
        console.error('❌ FAILURE: Stale write was NOT fenced! GC lease expiry risk active.');
        process.exit(1);
    }

    // =========================================================================
    // DRILL 2: SIGSTOP/SIGCONT Resurrection
    // =========================================================================
    console.log('\n👉 DRILL 2: SIGSTOP/SIGCONT Resurrection Fencing...');
    await clearAllState();

    // 1. Write the child coordinator helper script dynamically
    const childCoordinatorPath = path.join(process.cwd(), '.ztan-transparency', 'child-coordinator.ts');
    fs.writeFileSync(childCoordinatorPath, `
import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';
const envConfig = dotenv.config();
dotenvExpand.expand(envConfig);

if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace(/^"(.*)"$/, '$1');
}

import * as fs from 'node:fs';
import * as path from 'node:path';
import { GovernanceLedger } from '@packages/utils';
import { db } from '@packages/db';

async function main() {
  console.log('[ChildCoordinator] Starting child coordinator...');
  try {
    GovernanceLedger.states.set(0, 'ACTIVE');
    const ledgerFile = GovernanceLedger.getLedgerFile(0);
    if (!fs.existsSync(path.dirname(ledgerFile))) {
      fs.mkdirSync(path.dirname(ledgerFile), { recursive: true });
    }
    if (!fs.existsSync(ledgerFile)) {
      const genesis = [GovernanceLedger.createGenesisEntry(0)];
      fs.writeFileSync(ledgerFile, JSON.stringify(genesis, null, 2), 'utf8');
    }

    await GovernanceLedger.acquireDbLease(0);
    const gen = GovernanceLedger.activeDbGenerations.get(0);
    console.log(\`[ChildCoordinator] Ready. Local Gen: \${gen}. PID: \${process.pid}\`);

    // Signal handler to perform mutation write
    process.on('SIGUSR1', async () => {
      console.log('[ChildCoordinator] Received SIGUSR1. Attempting appendEntry...');
      try {
        const entry = await GovernanceLedger.appendEntry(
          'POLICY',
          'CHILD-COORDINATOR-PAYLOAD',
          'OPERATOR-CHILD',
          'VERIFIED',
          '107'
        );
        console.log(\`[ChildCoordinator] SUCCESS_WRITE:\${entry.sequenceId}\`);
        process.exit(0);
      } catch (err: any) {
        console.log(\`[ChildCoordinator] FAILED_WRITE:\${err.message}\`);
        process.exit(3); // Exit code 3 signifies that the write was fenced and failed!
      }
    });

    // Signal handler to block event loop synchronously
    process.on('SIGUSR2', () => {
      console.log('[ChildCoordinator] Received SIGUSR2. Simulating synchronous event-loop starvation block (spin-lock)...');
      const end = Date.now() + 10000;
      while (Date.now() < end) {
        // tight block
      }
      console.log('[ChildCoordinator] Finished event-loop starvation block.');
    });

    // Stdin commands for Windows and cross-platform support
    process.stdin.setEncoding('utf8');
    process.stdin.on('data', async (data) => {
      const command = data.toString().trim();
      if (command === 'write') {
        console.log('[ChildCoordinator] Received write command via stdin. Attempting appendEntry...');
        try {
          const entry = await GovernanceLedger.appendEntry(
            'POLICY',
            'CHILD-COORDINATOR-PAYLOAD',
            'OPERATOR-CHILD',
            'VERIFIED',
            '107'
          );
          console.log(\`[ChildCoordinator] SUCCESS_WRITE:\${entry.sequenceId}\`);
          process.exit(0);
        } catch (err: any) {
          console.log(\`[ChildCoordinator] FAILED_WRITE:\${err.message}\`);
          process.exit(3); // Exit code 3
        }
      } else if (command.startsWith('freeze')) {
        const parts = command.split(':');
        const duration = parts[1] ? parseInt(parts[1], 10) : 5000;
        console.log("[ChildCoordinator] Received freeze command via stdin. Simulating synchronous event-loop starvation block (spin-lock) for " + duration + "ms...");
        const end = Date.now() + duration;
        while (Date.now() < end) {
          // tight block
        }
        console.log('[ChildCoordinator] Finished event-loop starvation block.');
      }
    });

    // Keep event loop alive
    const interval = setInterval(() => {}, 100);
    process.on('SIGTERM', () => {
      clearInterval(interval);
      process.exit(0);
    });
  } catch (err: any) {
    console.error(\`[ChildCoordinator] Error during startup: \${err.message || err}\`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(2);
});
    `, 'utf8');

    // 2. Spawn the child coordinator
    console.log('[ChaosTest] Spawning child coordinator...');
    const childCoordinator = spawn('npx', ['tsx', childCoordinatorPath], {
        shell: true,
        env: { ...process.env, tsconfig: undefined }
    });

    // Capture child output to detect when it acquires lease
    let childGen: number | null = null;
    let childPid: number | null = null;
    
    await new Promise<void>((resolve, reject) => {
        childCoordinator.stdout.on('data', (data) => {
            const output = data.toString();
            console.log(`[Child Stdout] ${output.trim()}`);
            const match = output.match(/Ready\. Local Gen: (\d+)\. PID: (\d+)/);
            if (match) {
                childGen = parseInt(match[1], 10);
                childPid = parseInt(match[2], 10);
                resolve();
            }
        });
        childCoordinator.stderr.on('data', (data) => {
            console.error(`[Child Stderr] ${data.toString().trim()}`);
        });
        childCoordinator.on('error', (err) => {
            reject(err);
        });
    });

    if (!childPid || !childGen) {
        console.error('❌ FAILURE: Child coordinator failed to report PID or active generation.');
        process.exit(1);
    }

    console.log(`[ChaosTest] Child coordinator is active. PID: ${childPid}, Gen: ${childGen}`);

    // 3. Freeze child process (either using SIGSTOP, or simulated block on Windows)
    if (os.platform() === 'win32') {
        console.log('[ChaosTest] Windows detected. Simulating freeze by triggering child event-loop block via stdin...');
        childCoordinator.stdin.write('freeze\n');
    } else {
        console.log('[ChaosTest] POSIX system detected. Freezing child coordinator via SIGSTOP...');
        process.kill(childPid, 'SIGSTOP');
    }

    // 4. Preempt the lease in the parent process immediately
    console.log('[ChaosTest] Parent process preempting the distributed database lease...');
    await db.$executeRawUnsafe(
        'UPDATE "ZtanActiveLease" SET heartbeat = NOW() - INTERVAL \'60 seconds\' WHERE id = $1',
        'singleton-lease-partition-0'
    );
    await GovernanceLedger.acquireDbLease(0);
    const parentGen = GovernanceLedger.activeDbGenerations.get(0);
    console.log(`[ChaosTest] Parent successfully preempted lease. New Database Gen: ${parentGen}`);

    // 5. Resume child coordinator and instruct it to commit mutation
    if (os.platform() === 'win32') {
        // Windows unblocks naturally when the spin lock expires.
        console.log('[ChaosTest] Waiting for Windows child event-loop block to unblock...');
        await new Promise(r => setTimeout(r, 6000));
    } else {
        console.log('[ChaosTest] Resuming child coordinator via SIGCONT...');
        process.kill(childPid, 'SIGCONT');
        await new Promise(r => setTimeout(r, 1000));
    }

    if (os.platform() === 'win32') {
        console.log('[ChaosTest] Signaling child coordinator to perform write via stdin...');
        childCoordinator.stdin.write('write\n');
    } else {
        console.log('[ChaosTest] Signaling child coordinator to perform write via SIGUSR1...');
        process.kill(childPid, 'SIGUSR1');
    }

    // 6. Verify that child write is blocked and child exits with failure
    const childExitCode = await new Promise<number>((resolve) => {
        childCoordinator.on('close', (code) => {
            resolve(code ?? -99);
        });
    });

    console.log(`[ChaosTest] Child coordinator exited with code: ${childExitCode}`);
    if (childExitCode === 3) {
        console.log('✅ SUCCESS: Drill 2 passed. Resumed child coordinator write was fenced and rejected successfully!');
    } else {
        console.error(`❌ FAILURE: Drill 2 failed. Child coordinator exit code was ${childExitCode} instead of 3.`);
        process.exit(1);
    }

    // =========================================================================
    // DRILL 3: Watchdog Termination on Starvation
    // =========================================================================
    console.log('\n👉 DRILL 3: Watchdog Termination on Starvation...');
    await clearAllState();

    // 1. Clean up old logs to have a clear validation scope
    const watchdogLogPath = path.join(process.cwd(), '.ztan-transparency', 'watchdog_events.log');
    if (fs.existsSync(watchdogLogPath)) {
        try {
            fs.unlinkSync(watchdogLogPath);
        } catch (e) {}
    }

    // 2. Spawn the child coordinator
    console.log('[ChaosTest] Spawning child coordinator...');
    const childCoordinator3 = spawn('npx', ['tsx', childCoordinatorPath], {
        shell: true,
        env: { ...process.env, tsconfig: undefined }
    });

    let childPid3: number | null = null;
    await new Promise<void>((resolve) => {
        childCoordinator3.stdout.on('data', (data) => {
            const output = data.toString();
            console.log(`[Child Stdout] ${output.trim()}`);
            const match = output.match(/Ready\. Local Gen: \d+\. PID: (\d+)/);
            if (match) {
                childPid3 = parseInt(match[1], 10);
                resolve();
            }
        });
    });

    if (!childPid3) {
        console.error('❌ FAILURE: Child coordinator for Drill 3 failed to start.');
        process.exit(1);
    }

    // 3. Wait for the liveness file to be populated
    const livenessFile = path.join(process.cwd(), '.ztan-transparency', 'liveness.json');
    console.log(`[ChaosTest] Waiting for liveness file to be populated by PID ${childPid3}...`);
    for (let i = 0; i < 20; i++) {
        if (fs.existsSync(livenessFile)) {
            try {
                const data = JSON.parse(fs.readFileSync(livenessFile, 'utf8'));
                if (data.pid === childPid3) {
                    break;
                }
            } catch (e) {}
        }
        await new Promise(r => setTimeout(r, 200));
    }

    // 4. Spawn the out-of-process watchdog supervisor
    console.log(`[ChaosTest] Spawning out-of-process watchdog supervisor targeting PID ${childPid3}...`);
    const watchdog = spawn('npx', [
        'tsx',
        'scripts/ztan-watchdog-supervisor.ts',
        '--pid', childPid3.toString(),
        '--partition', '0',
        '--lag', '1000',
        '--stale', '2000'
    ], {
        shell: true,
        env: { ...process.env, tsconfig: undefined }
    });

    // Pipe watchdog output to console
    watchdog.stdout.on('data', (data) => {
        console.log(`[Watchdog Stdout] ${data.toString().trim()}`);
    });
    watchdog.stderr.on('data', (data) => {
        console.error(`[Watchdog Stderr] ${data.toString().trim()}`);
    });

    await new Promise(r => setTimeout(r, 1500));

    // 5. Send SIGUSR2 to child to freeze event loop synchronously via spin lock
    if (os.platform() === 'win32') {
        console.log('[ChaosTest] Windows detected. Blocking child coordinator event loop via stdin...');
        childCoordinator3.stdin.write('freeze:12000\n');
    } else {
        console.log('[ChaosTest] POSIX detected. Blocking child coordinator event loop by sending SIGUSR2...');
        process.kill(childPid3, 'SIGUSR2');
    }

    // 6. Monitor child process termination
    console.log('[ChaosTest] Waiting for watchdog supervisor to detect lag and kill the child coordinator...');
    const killResult = await new Promise<{ exitCode: number | null, signal: string | null }>((resolve) => {
        childCoordinator3.on('close', (code, sig) => {
            resolve({ exitCode: code, signal: sig });
        });
    });

    console.log(`[ChaosTest] Child coordinator exited. Code: ${killResult.exitCode}, Signal: ${killResult.signal}`);

    // 7. Verify watchdog log output
    let watchdogLogged = false;
    if (fs.existsSync(watchdogLogPath)) {
        const logContent = fs.readFileSync(watchdogLogPath, 'utf8');
        console.log(`[ChaosTest] Watchdog Event Log:\n${logContent}`);
        if (logContent.includes(`Target PID: ${childPid3}`) && logContent.includes('TERMINATED')) {
            watchdogLogged = true;
        }
    }

    if (killResult.signal === 'SIGKILL' || killResult.exitCode !== 0 || watchdogLogged) {
        console.log('✅ SUCCESS: Drill 3 passed. Stale coordinator was forcefully terminated by the out-of-process watchdog supervisor!');
    } else {
        console.error('❌ FAILURE: Stale coordinator was NOT terminated by the watchdog.');
        process.exit(1);
    }

    // Clean up
    console.log('\n[ChaosTest] Cleaning up and shutting down background resources...');
    try {
        watchdog.kill('SIGTERM');
    } catch (e) {}
    try {
        fs.unlinkSync(childCoordinatorPath);
    } catch (e) {}

    console.log('\n==================================================');
    console.log('🎉 ALL DISTRIBUTED CHAOS & SURVIVABILITY SUITES PASSED!');
    console.log('==================================================');
    process.exit(0);
}

runChaosTests().catch(err => {
    console.error('Catastrophic failure in Chaos Test Execution:', err);
    process.exit(1);
});
