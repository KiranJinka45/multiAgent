import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as child_process from 'node:child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Set DATABASE_URL explicitly to connect to the resilience database container
process.env.DATABASE_URL = 'postgresql://postgres:password@localhost:54399/multiagent?schema=public';

async function main() {
  console.log('================================================================');
  console.log('⏳ STARTING LONG-DURATION TEMPORAL & DB OUTAGE RESILIENCE DRILL');
  console.log('================================================================');

  const { injectDbOutage, clearDbOutage, db } = await import('../packages/db/src/index.js');
  const { Connection, Client } = await import('@temporalio/client');

  // Clean the database blocks
  console.log('[Prep] Cleaning ZtanLedgerBlock table...');
  await db.ztanLedgerBlock.deleteMany({});

  const metrics = {
    step1_workerBooted: false,
    step2_workflowStarted: false,
    step3_dbOutageInjected: false,
    step4_workerCrashed: false,
    step5_workerRestarted: false,
    step6_durableCompletion: false,
    finalVerdict: 'FAILED'
  };

  const isWindows = process.platform === 'win32';
  const npmCmd = isWindows ? 'npx.cmd' : 'npx';

  // -------------------------------------------------------------------------
  // Step 1: Boot the independent Temporal Worker process
  // -------------------------------------------------------------------------
  console.log('\nStep 1: Booting independent Temporal Worker process...');
  let workerProcess = child_process.spawn(npmCmd, ['tsx', 'scripts/resilience-worker.ts'], {
    stdio: 'pipe',
    shell: true,
    cwd: rootDir
  });

  workerProcess.stdout.on('data', (data) => console.log(`  [Worker PID ${workerProcess.pid}] ${data.toString().trim()}`));
  workerProcess.stderr.on('data', (data) => console.error(`  [Worker PID ${workerProcess.pid}] ERROR: ${data.toString().trim()}`));

  // Wait for worker to signal startup
  await new Promise<void>((resolve) => {
    const onData = (data: Buffer) => {
      if (data.toString().includes('Worker started')) {
        workerProcess.stdout.off('data', onData);
        metrics.step1_workerBooted = true;
        resolve();
      }
    };
    workerProcess.stdout.on('data', onData);
  });

  console.log('   ✅ Temporal Worker process online and listening.');

  // -------------------------------------------------------------------------
  // Step 2: Initialize Client and start Workflow
  // -------------------------------------------------------------------------
  console.log('\nStep 2: Starting databaseResilienceWorkflow...');
  const connection = await Connection.connect({ address: 'localhost:7233' });
  const client = new Client({ connection });

  const workflowId = `resilience-workflow-${Date.now()}`;
  const handle = await client.workflow.start('databaseResilienceWorkflow', {
    taskQueue: 'resilience-tasks',
    workflowId,
    args: ['payload-resilience-value']
  });

  console.log(`   ✅ Workflow started with ID: ${workflowId}`);
  metrics.step2_workflowStarted = true;

  // -------------------------------------------------------------------------
  // Step 3: Wait for activity to start, then inject DB outage
  // -------------------------------------------------------------------------
  console.log('\nStep 3: Awaiting activity start, then injecting DB outage...');
  await new Promise<void>((resolve) => {
    const onData = (data: Buffer) => {
      if (data.toString().includes('Attempting write to database')) {
        workerProcess.stdout.off('data', onData);
        resolve();
      }
    };
    workerProcess.stdout.on('data', onData);
  });

  console.log('   - Activity database write detected. Injecting DB outage (6s)...');
  injectDbOutage(6000, 'db');
  metrics.step3_dbOutageInjected = true;

  // -------------------------------------------------------------------------
  // Step 4: Crash the Worker process
  // -------------------------------------------------------------------------
  console.log('\nStep 4: Simulating worker crash (killing worker process via SIGKILL)...');
  workerProcess.kill('SIGKILL');
  console.log(`   ✅ Worker process (PID ${workerProcess.pid}) hard killed.`);
  metrics.step4_workerCrashed = true;

  // Wait 3 seconds in crashed state
  await new Promise(r => setTimeout(r, 3000));

  // -------------------------------------------------------------------------
  // Step 5: Restart the Worker process
  // -------------------------------------------------------------------------
  console.log('\nStep 5: Restarting Worker process from scratch...');
  let restartedWorkerProcess = child_process.spawn(npmCmd, ['tsx', 'scripts/resilience-worker.ts'], {
    stdio: 'pipe',
    shell: true,
    cwd: rootDir
  });

  restartedWorkerProcess.stdout.on('data', (data) => console.log(`  [New Worker PID ${restartedWorkerProcess.pid}] ${data.toString().trim()}`));
  restartedWorkerProcess.stderr.on('data', (data) => console.error(`  [New Worker PID ${restartedWorkerProcess.pid}] ERROR: ${data.toString().trim()}`));

  // Wait for new worker startup
  await new Promise<void>((resolve) => {
    const onData = (data: Buffer) => {
      if (data.toString().includes('Worker started')) {
        restartedWorkerProcess.stdout.off('data', onData);
        metrics.step5_workerRestarted = true;
        resolve();
      }
    };
    restartedWorkerProcess.stdout.on('data', onData);
  });

  console.log('   ✅ New worker process online. Resuming task queue routing.');

  // -------------------------------------------------------------------------
  // Step 6: Verify durable completion after healing
  // -------------------------------------------------------------------------
  console.log('\nStep 6: Awaiting durable completion of the workflow...');
  
  // Wait for the workflow result
  const finalBlockId = await handle.result();
  console.log(`   - Workflow result: Created Block ID: ${finalBlockId}`);

  // Confirm database record exists
  const blockInDb = await db.ztanLedgerBlock.findUnique({
    where: { blockId: finalBlockId }
  });

  console.log(`   - Database record found: ${blockInDb !== null}`);

  if (finalBlockId && blockInDb) {
    console.log('   ✅ Durable completion verified! Workflow successfully recovered from crash & DB outage.');
    metrics.step6_durableCompletion = true;
  }

  // Final check
  if (
    metrics.step1_workerBooted &&
    metrics.step2_workflowStarted &&
    metrics.step3_dbOutageInjected &&
    metrics.step4_workerCrashed &&
    metrics.step5_workerRestarted &&
    metrics.step6_durableCompletion
  ) {
    metrics.finalVerdict = 'PASSED';
  }

  // Teardown
  console.log('\n[Clean] Shutting down worker processes...');
  restartedWorkerProcess.kill();
  clearDbOutage();

  // Write campaign metrics file
  const reportPath = path.join(rootDir, 'telemetry-history', 'temporal_resilience_latest.json');
  fs.writeFileSync(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    metrics,
  }, null, 2), 'utf-8');

  console.log('================================================================');
  console.log(`🏁 DRILL FINISHED. Verdict: ${metrics.finalVerdict}`);
  console.log('================================================================');
  process.exit(metrics.finalVerdict === 'PASSED' ? 0 : 1);
}

main().catch(err => {
  console.error(`Fatal crash: ${err.message}`);
  process.exit(1);
});
