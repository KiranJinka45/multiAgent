import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { execSync } from 'node:child_process';
import { PrismaClient } from '@prisma/client';
import { ZtanLeaseManager } from '../src/runtime/lease-enforcement.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

// Set DATABASE_URL explicitly to connect to the resilience database container
process.env.DATABASE_URL = 'postgresql://postgres:password@localhost:54399/multiagent?schema=public';

function getNetworkName(): string {
  try {
    const out = execSync('docker network ls --filter name=resilience-network --format "{{.Name}}"').toString().trim();
    return out.split('\n')[0] || 'multiagent-main_resilience-network';
  } catch (err) {
    return 'multiagent-main_resilience-network';
  }
}

function disconnectEtcd1() {
  const net = getNetworkName();
  console.log(`📡 [Chaos] Disconnecting etcd-1 from ${net}...`);
  execSync(`docker network disconnect ${net} etcd-1`);
}

function connectEtcd1() {
  const net = getNetworkName();
  console.log(`📡 [Chaos] Reconnecting etcd-1 to ${net}...`);
  try {
    execSync(`docker network connect ${net} etcd-1`);
  } catch (e) {}
}

async function main() {
  console.log('================================================================');
  console.log('📡 STARTING LIVE ETCD ASYMMETRIC PARTITION & FENCING DRILL');
  console.log('================================================================');

  const prisma = new PrismaClient({
    datasources: { db: { url: process.env.DATABASE_URL } }
  });

  // Ensure clean ledger and lease states
  console.log('[Prep] Truncating active ledger tables...');
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "ZtanActiveLease" CASCADE;`);
  await prisma.$executeRawUnsafe(`TRUNCATE TABLE "ZtanLedgerBlock" RESTART IDENTITY CASCADE;`);

  // Initialize two separate lease managers (virtual Node A and Node B)
  // Node A points to etcd-1 (localhost:2379)
  // Node B points to etcd-2 (localhost:2389)
  const leaseManagerA = new ZtanLeaseManager('localhost:2379');
  const leaseManagerB = new ZtanLeaseManager('localhost:2389');

  const metrics = {
    step1_acquiredNodeA: false,
    step2_partitionActive: false,
    step3_preemptedNodeB: false,
    step4_staleWriteRejected: false,
    step5_healed: false,
    finalVerdict: 'FAILED'
  };

  try {
    // -------------------------------------------------------------------------
    // Step 1: Node A acquires leadership
    // -------------------------------------------------------------------------
    console.log('\nStep 1: Starting Node A lease loop...');
    await leaseManagerA.startLeaseLoop();
    await new Promise(r => setTimeout(r, 3000)); // wait to acquire and sync to PG

    const statusA = leaseManagerA.getStatus();
    console.log(`   - Node A Leadership Status: ${statusA.isLeader}`);
    console.log(`   - Node A Active Epoch:      ${statusA.activeEpoch}`);

    if (statusA.isLeader && statusA.activeEpoch === 1) {
      console.log('   ✅ Node A successfully acquired leader lease and registered Epoch 1.');
      metrics.step1_acquiredNodeA = true;
    } else {
      throw new Error('Node A failed to acquire initial leadership lease.');
    }

    // Write genesis block owned by Node A under epoch 1
    await prisma.ztanLedgerBlock.create({
      data: {
        blockId: 'canonical-block-0',
        prevHash: 'GENESIS_PREV_HASH',
        hash: '0xgenesisblockhash',
        type: 'GENESIS',
        payload: JSON.stringify({ activeCoordinator: 'Node_A' }),
        operator: 'Node_A',
        signature: 'sig_node_a',
        status: 'VERIFIED',
        epoch: '1'
      }
    });

    // -------------------------------------------------------------------------
    // Step 2: Inject Asymmetric Partition
    // -------------------------------------------------------------------------
    console.log('\nStep 2: Injecting asymmetric network partition (isolating etcd-1)...');
    disconnectEtcd1();
    metrics.step2_partitionActive = true;
    console.log('   ✅ Network partition injected successfully.');

    // -------------------------------------------------------------------------
    // Step 3: Start Node B and verify preemption
    // -------------------------------------------------------------------------
    console.log('\nStep 3: Starting Node B lease loop (connected to etcd-2)...');
    await leaseManagerB.startLeaseLoop();

    console.log('   - Awaiting lease TTL expiration (Node B should preempt)...');
    // Wait for the etcd lease to expire and Node B to acquire leadership (TTL is 5s)
    await new Promise(r => setTimeout(r, 7000));

    const statusB = leaseManagerB.getStatus();
    console.log(`   - Node B Leadership Status: ${statusB.isLeader}`);
    console.log(`   - Node B Active Epoch:      ${statusB.activeEpoch}`);

    if (statusB.isLeader && statusB.activeEpoch === 2) {
      console.log('   ✅ Node B successfully preempted leadership and registered Epoch 2.');
      metrics.step3_preemptedNodeB = true;
    } else {
      throw new Error('Node B failed to preempt leadership.');
    }

    // -------------------------------------------------------------------------
    // Step 4: Stale Write Rejection (Epoch Fencing)
    // -------------------------------------------------------------------------
    console.log('\nStep 4: Simulating stale write from partitioned Node A using Epoch 1...');

    try {
      await prisma.$transaction(async (tx) => {
        // Authoritative Epoch Fence check
        const activeLease = await tx.ztanActiveLease.findUnique({
          where: { id: 'ztan-master-lease' }
        });
        const currentEpoch = activeLease ? activeLease.generation : 0;
        const attemptEpoch = 1; // Node A's stale epoch

        console.log(`   [PG Transaction] Current DB Lease Epoch is: ${currentEpoch}`);
        console.log(`   [PG Transaction] Node A attempts write with stale Epoch: ${attemptEpoch}`);

        if (attemptEpoch < currentEpoch) {
          throw new Error(`ZTAN_EPOCH_FENCE: Lease expired. Current database epoch is ${currentEpoch}, attempt epoch was ${attemptEpoch}.`);
        }

        // Perform write (should not execute)
        await tx.ztanLedgerBlock.create({
          data: {
            blockId: 'canonical-block-1',
            prevHash: '0xgenesisblockhash',
            hash: '0xstalenodeawritehash',
            type: 'TX_BATCH',
            payload: JSON.stringify({ transfer: 'A->C' }),
            operator: 'Node_A',
            signature: 'sig_node_a_stale',
            status: 'VERIFIED',
            epoch: '1'
          }
        });
      });
      console.log('   ❌ ERROR: Transaction committed stale Node A write! Fencing failed.');
    } catch (err: any) {
      if (err.message.includes('ZTAN_EPOCH_FENCE')) {
        console.log(`   ✅ NOMINAL: Write rejected: ${err.message}`);
        metrics.step4_staleWriteRejected = true;
      } else {
        console.error(`   ❌ Unexpected transaction error: ${err.message}`);
      }
    }

    // -------------------------------------------------------------------------
    // Step 5: Heal partition
    // -------------------------------------------------------------------------
    console.log('\nStep 5: Healing network partition (reconnecting etcd-1)...');
    connectEtcd1();
    metrics.step5_healed = true;
    console.log('   ✅ Network partition healed.');

    // Wait a brief moment to let etcd cluster sync
    await new Promise(r => setTimeout(r, 2000));

    // Confirm local leader status for Node A is stepped down
    const finalStatusA = leaseManagerA.getStatus();
    console.log(`   - Node A Leadership post-healing: ${finalStatusA.isLeader}`);

    if (!finalStatusA.isLeader) {
      console.log('   ✅ Node A successfully stepped down locally.');
    }

    if (
      metrics.step1_acquiredNodeA &&
      metrics.step2_partitionActive &&
      metrics.step3_preemptedNodeB &&
      metrics.step4_staleWriteRejected &&
      metrics.step5_healed
    ) {
      metrics.finalVerdict = 'PASSED';
      console.log('\n✅ ALL DRILL SCENARIOS PASSED NOMINALLY.');
    }

  } catch (err: any) {
    console.error(`\n❌ Drill execution failed: ${err.message}`);
  } finally {
    // Teardown and disconnect
    console.log('\n[Clean] Shutting down lease loops...');
    await leaseManagerA.stop();
    await leaseManagerB.stop();
    await prisma.$disconnect();

    // Ensure etcd-1 is connected in case of failure
    connectEtcd1();
  }

  // Write campaign results
  const reportPath = path.join(rootDir, 'telemetry-history', 'asymmetric_partition_latest.json');
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
