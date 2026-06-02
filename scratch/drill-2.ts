import { ConsensusEngine } from '../packages/governance-core/src/ledger/consensus.js';
import { MerkleTree } from '../packages/governance-core/src/ledger/merkle.js';
import * as crypto from 'node:crypto';

async function runDrill() {
    console.log('=== Drill 2: Live PostgreSQL Outage Drill ===');
    console.log('[Drill] Initializing ConsensusEngine...');
    
    // Create a mock keypair
    const { privateKey, publicKey } = crypto.generateKeyPairSync('ec', {
        namedCurve: 'secp256k1',
        publicKeyEncoding: { type: 'spki', format: 'pem' },
        privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    ConsensusEngine.configureNodes([
        { nodeId: 'node-1', isAlive: true },
        { nodeId: 'node-2', isAlive: true },
        { nodeId: 'node-3', isAlive: true }
    ]);

    const cluster = ConsensusEngine.getClusterNodes();
    for (const [id, node] of cluster.entries()) {
        node.publicKey = publicKey;
        node.privateKey = privateKey;
    }

    // Override process.exit to prevent the drill script itself from exiting abruptly, 
    // but we can spy on it to prove it was called.
    const originalExit = process.exit;
    let exitCalled = false;
    let exitCode = 0;
    (process as any).exit = (code: number) => {
        console.log(`[Drill Hook] Intercepted process.exit(${code})`);
        exitCalled = true;
        exitCode = code;
    };

    console.log('[Drill] Triggering PBFT appendEntries to simulate a ledger commit.');
    console.log('[Drill] Since there is no local DB running, persistence should fail naturally and trigger the fence.');
    
    try {
        const payloadStr = '{"type":"CREATE_TENANT"}';
        const entries = [{ term: 1, command: payloadStr }];
        const root = MerkleTree.computeRoot(entries);
        const signature = crypto.sign(null, Buffer.from(`1:${root}`), privateKey).toString('base64');
        
        const result = ConsensusEngine.appendEntries(
            'node-1',
            1,
            entries,
            root,
            signature
        );
        console.log('[Drill] appendEntries returned synchronously:', result);
        
        // Wait a tick for the async persistence task to throw and catch
        await new Promise(r => setTimeout(r, 5000));
        
        if (exitCalled && exitCode === 1) {
            console.log('\n[Drill] SUCCESS: The DB connection failed and the fail-closed DB Fence was triggered!');
        } else {
            console.log('\n[Drill] FAILED: process.exit(1) was never called.');
        }

    } catch (err: any) {
        console.error('[Drill] Error:', err);
    }
}

runDrill();
