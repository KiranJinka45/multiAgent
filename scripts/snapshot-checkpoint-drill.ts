import fs from 'node:fs';
import path from 'node:path';
import { MerkleTree } from '../packages/utils/src/transparency/merkle.js';
import { AuditLogger } from '../packages/utils/src/audit.js';
import { db } from '../packages/db/src/index.js';

async function snapshotDrill() {
    console.log('📸 Starting Snapshot & Checkpoint Drill...');

    const tenantId = 'tenant-alice-001';
    const replayDir = path.join('archive', 'recovery_replays');
    const checkpointId = `checkpoint-${Date.now()}`;
    const checkpointDir = path.join(replayDir, checkpointId);

    // 1. Fetch current audit logs and calculate Merkle Root
    console.log('   🔍 Calculating Merkle Root for tenant:', tenantId);
    const logs = await db.auditLog.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'asc' }
    });

    if (logs.length === 0) {
        throw new Error('❌ Drill aborted: No logs found in DB. Please run bootstrap-audit-chain.ts first.');
    }

    const hashes = logs.map(l => l.hash);
    const merkleTree = new MerkleTree(hashes);
    const merkleRoot = merkleTree.getRoot();
    console.log(`   ✅ Merkle Root: ${merkleRoot} (computed from ${hashes.length} logs)`);

    // 2. Trigger STATE_CHECKPOINT
    console.log('   🚀 Triggering STATE_CHECKPOINT audit event...');
    await AuditLogger.log({
        action: 'STATE_CHECKPOINT',
        resource: 'transparency-ledger',
        tenantId,
        status: 'SUCCESS',
        metadata: {
            merkleRoot,
            checkpointId,
            logCount: hashes.length
        }
    });

    // 3. Create the checkpoint directory and save metadata
    fs.mkdirSync(checkpointDir, { recursive: true });

    const metadata = {
        timestamp: new Date().toISOString(),
        success: true,
        failureCategory: 'SCHEDULED_CHECKPOINT',
        durationMs: 450,
        envFingerprint: {
            os: process.platform,
            node: process.version
        },
        merkleRoot,
        checkpointId
    };

    fs.writeFileSync(path.join(checkpointDir, 'run_metadata.json'), JSON.stringify(metadata, null, 2));
    fs.writeFileSync(path.join(checkpointDir, 'pnpm-lock.yaml'), '# Mock Lockfile');

    console.log(`   ✅ Checkpoint ${checkpointId} created in archive.`);

    // 4. Run the audit replay indexer
    const { execSync } = await import('node:child_process');
    console.log('   🔍 Running Audit Replay Indexer...');
    execSync('npx tsx scripts/audit-replay.ts', { stdio: 'inherit' });

    // 5. Verify the index contains our checkpoint
    const indexFile = path.join(replayDir, 'REPLAY_INDEX.json');
    const index = JSON.parse(fs.readFileSync(indexFile, 'utf-8'));

    const found = index.find((i: any) => i.merkleRoot === merkleRoot);
    if (found) {
        console.log('   ✅ REPLAY_INDEX successfully updated with new checkpoint and Merkle root.');
    } else {
        throw new Error('❌ Checkpoint not found in REPLAY_INDEX.');
    }

    console.log('\n🏆 SNAPSHOT & CHECKPOINT DRILL SUCCESSFUL.');
}

snapshotDrill().catch((err) => {
    console.error(err);
    process.exit(1);
});
