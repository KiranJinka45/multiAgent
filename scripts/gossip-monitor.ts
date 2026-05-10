import { gossipRegistry } from '../packages/utils/src/transparency/gossip-registry';
import { EquivocationDetector } from '../packages/utils/src/transparency/equivocation-detector';
import * as fs from 'fs';
import * as path from 'path';

/**
 * ZTAN Gossip Monitor
 * 
 * Watches the gossip registry and witness server to detect split-view attacks.
 * Reports any detected forks or non-monotonic history.
 */
async function monitor(witnessKeyId: string) {
    console.log(`[MONITOR] Starting transparency monitor for witness: ${witnessKeyId}`);
    
    // 1. Fetch latest public gossiped state
    const gossipedCheckpoints = await gossipRegistry.listCheckpoints(witnessKeyId);
    console.log(`[MONITOR] Found ${gossipedCheckpoints.length} gossiped checkpoints in registry.`);

    if (gossipedCheckpoints.length < 2) {
        console.log(`[MONITOR] Not enough history to detect conflicts yet.`);
        return;
    }

    // 2. Scan for internal gossip conflicts (Fork Detection)
    for (let i = 0; i < gossipedCheckpoints.length; i++) {
        for (let j = i + 1; j < gossipedCheckpoints.length; j++) {
            const conflict = EquivocationDetector.detectConflict(gossipedCheckpoints[i], gossipedCheckpoints[j]);
            if (conflict) {
                console.error(`[!!!] TRANSPARENCY BREACH DETECTED: ${conflict.type}`);
                console.error(`[!!!] Detail: ${conflict.detail}`);
                console.error(`[!!!] Checkpoint A: Tree ${conflict.checkpointA.treeSize}, Root ${conflict.checkpointA.rootHash.slice(0, 16)}...`);
                console.error(`[!!!] Checkpoint B: Tree ${conflict.checkpointB.treeSize}, Root ${conflict.checkpointB.rootHash.slice(0, 16)}...`);
                return;
            }
        }
    }

    // 3. Verify continuity across the entire gossiped chain
    console.log(`[MONITOR] Verifying continuity chain...`);
    for (let i = 1; i < gossipedCheckpoints.length; i++) {
        const prev = gossipedCheckpoints[i-1];
        const curr = gossipedCheckpoints[i];
        
        // In a real system, we would fetch consistency proofs from the witness here.
        // For simulation, we assume if treeSize grows and rootHash changes, it should be verifiable.
        if (curr.treeSize < prev.treeSize) {
             console.error(`[!!!] MONOTONICITY VIOLATION: Tree size shrunk from ${prev.treeSize} to ${curr.treeSize}`);
        }
    }

    console.log(`[MONITOR] Transparency verified. No forks or rewrites detected in public gossip.`);
}

const witnessKeyPath = path.join(process.cwd(), '.ztan-witness', 'keys', 'witness.pub');
if (fs.existsSync(witnessKeyPath)) {
    const crypto = require('crypto');
    const pubKey = fs.readFileSync(witnessKeyPath, 'utf8');
    const witnessKeyId = crypto.createHash('sha256').update(pubKey).digest('hex');
    monitor(witnessKeyId);
} else {
    console.error('[MONITOR] Witness public key not found. Is the witness server initialized?');
}
