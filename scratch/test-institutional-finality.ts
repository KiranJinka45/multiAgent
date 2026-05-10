import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { spawn, ChildProcess } from 'child_process';
import axios from 'axios';
import { WitnessFederation, WitnessMember } from '../packages/utils/src/transparency/witness-federation';
import { GovernanceCoordinator, GovernanceCouncilMember } from '../packages/utils/src/transparency/governance-authority';
import { GovernanceReceipt, governanceSignablePayload } from '../packages/utils/src/transparency/governance';
import { MerkleTree } from '../packages/utils/src/transparency/merkle';

const PROJECT_ROOT = process.cwd();
const TRANSPARENCY_DIR = path.join(PROJECT_ROOT, '.ztan-transparency');
const GOVERNANCE_DIR = path.join(TRANSPARENCY_DIR, 'governance');
const TRACE_DIR = path.join(PROJECT_ROOT, '.ztan', 'trace');

// Test Council Members
const councilKeys = [
    path.join(GOVERNANCE_DIR, 'c1'),
    path.join(GOVERNANCE_DIR, 'c2'),
    path.join(GOVERNANCE_DIR, 'c3')
];

/**
 * PHASE 11: Institutional Finality Simulation
 */
async function main() {
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  PHASE 11: Institutional Finality & Epoch Simulation        ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');

    // Clean start
    if (fs.existsSync(TRANSPARENCY_DIR)) fs.rmSync(TRANSPARENCY_DIR, { recursive: true });
    fs.mkdirSync(GOVERNANCE_DIR, { recursive: true });
    if (!fs.existsSync(TRACE_DIR)) fs.mkdirSync(TRACE_DIR, { recursive: true });

    const c1 = new GovernanceCouncilMember(councilKeys[0]);
    const c2 = new GovernanceCouncilMember(councilKeys[1]);
    const c3 = new GovernanceCouncilMember(councilKeys[2]);
    const coordinator = new GovernanceCoordinator(GOVERNANCE_DIR);

    // Bootstrap federation for simulation tracking
    const bootstrapMembers: WitnessMember[] = [
        { id: 'w1', publicKey: 'pub1', url: 'http://localhost:8081' },
        { id: 'w2', publicKey: 'pub2', url: 'http://localhost:8082' },
        { id: 'w3', publicKey: 'pub3', url: 'http://localhost:8083' }
    ];
    const localFed = new WitnessFederation(bootstrapMembers, 2);
    const govTree = new MerkleTree();

    // 1. Genesis Bootstrap (Epoch 0)
    console.log('[1] Bootstrapping Genesis (Epoch 0)...');
    const genesisAction = {
        action: 'COUNCIL_UPDATE' as any,
        newCouncil: {
            members: [
                { id: c1.getKeyId(), publicKey: c1.getPublicKeyPem() },
                { id: c2.getKeyId(), publicKey: c2.getPublicKeyPem() },
                { id: c3.getKeyId(), publicKey: c3.getPublicKeyPem() }
            ],
            threshold: 2
        },
        effectiveTimestamp: new Date().toISOString(),
        reason: 'Bootstrap Council.',
        sequenceNumber: 0,
        epochId: 0,
        previousGRoot: govTree.getRoot()
    };
    
    // Calculate final root for the receipt
    const genesisPayload = governanceSignablePayload(genesisAction as any);
    govTree.append(MerkleTree.hashLeaf(genesisPayload));
    const genesisReceipt = { ...genesisAction, gRoot: govTree.getRoot(), signatures: [] } as GovernanceReceipt;
    
    fs.writeFileSync(path.join(GOVERNANCE_DIR, 'governance.log.ndjson'), JSON.stringify(genesisReceipt) + '\n');
    localFed.applyGovernanceReceipt(genesisReceipt);

    // 2. Add Witnesses (Epoch 0)
    console.log('[2] Adding witnesses to Epoch 0...');
    for (let i = 0; i < 3; i++) {
        const ctx = localFed.getEpochId() === 0 ? { epochId: 0, lastSeq: i, gRoot: localFed.getGovernanceRoot() } : { epochId: 0, lastSeq: i, gRoot: '' }; // simplified
        const action = {
            action: 'WITNESS_ADD' as any,
            targetWitnessId: `W${i+1}`,
            targetWitnessConfig: { publicKey: `PUB${i+1}`, url: `http://localhost:808${i+1}` },
            effectiveTimestamp: new Date().toISOString(),
            reason: `Adding W${i+1}.`,
            sequenceNumber: i + 1,
            epochId: 0,
            previousGRoot: localFed.getGovernanceRoot()
        };
        const payload = governanceSignablePayload(action as any);
        const tempTree = new MerkleTree([MerkleTree.hashLeaf(governanceSignablePayload(genesisReceipt))]);
        for(let j=0; j<i; j++) tempTree.append(MerkleTree.hashLeaf('dummy')); // Correcting logic for simulation...
        
        // Actually, just use the localFed to get the correct roots
        const receipt = coordinator.propose({
            ...action,
            gRoot: '' // will be fixed
        }, [c1, c2]);
        
        // Re-calculate gRoot properly
        const leaf = MerkleTree.hashLeaf(governanceSignablePayload(receipt));
        const tree = new MerkleTree();
        localFed.getGovernanceLog().forEach(r => tree.append(MerkleTree.hashLeaf(governanceSignablePayload(r))));
        tree.append(leaf);
        receipt.gRoot = tree.getRoot();
        
        // Update signatures because payload changed? No, gRoot is NOT in signable payload.
        // Wait, gRoot IS in the receipt but not in signable payload. So signatures are still valid.
        
        // Let's rewrite the propose to be more integrated
        fs.writeFileSync(path.join(GOVERNANCE_DIR, 'governance.log.ndjson'), JSON.stringify(receipt) + '\n');
        const err = localFed.applyGovernanceReceipt(receipt);
        if (err) throw new Error(err);
    }

    // 3. Epoch Transition (COUNCIL_UPDATE)
    console.log('[3] Triggering Epoch Transition (Epoch 0 -> 1)...');
    const ctx = { epochId: localFed.getEpochId(), lastSeq: localFed.getGovernanceLog().filter(r => r.epochId === 0).length - 1, gRoot: localFed.getGovernanceRoot() };
    
    const transitionAction = {
        action: 'COUNCIL_UPDATE' as any,
        newCouncil: {
            members: [
                { id: c1.getKeyId(), publicKey: c1.getPublicKeyPem() },
                { id: c2.getKeyId(), publicKey: c2.getPublicKeyPem() }
            ],
            threshold: 2
        },
        effectiveTimestamp: new Date().toISOString(),
        reason: 'Downsizing council.',
        sequenceNumber: ctx.lastSeq + 1,
        epochId: 0,
        previousGRoot: ctx.gRoot
    };
    
    const transitionReceipt = coordinator.propose({
        ...transitionAction,
        gRoot: ''
    }, [c1, c2]);
    
    const tree = new MerkleTree();
    localFed.getGovernanceLog().forEach(r => tree.append(MerkleTree.hashLeaf(governanceSignablePayload(r))));
    tree.append(MerkleTree.hashLeaf(governanceSignablePayload(transitionReceipt)));
    transitionReceipt.gRoot = tree.getRoot();
    
    fs.writeFileSync(path.join(GOVERNANCE_DIR, 'governance.log.ndjson'), JSON.stringify(transitionReceipt) + '\n');
    localFed.applyGovernanceReceipt(transitionReceipt);
    
    console.log(`    ✓ Transitioned to Epoch ${localFed.getEpochId()}. Root: ${localFed.getGovernanceRoot().slice(0,16)}...`);

    // 4. Test Lineage Breach (Divergent Root)
    console.log('[4] Testing Lineage Breach (Divergent Root)...');
    const badReceipt = {
        ...transitionReceipt,
        sequenceNumber: 0,
        epochId: 1,
        previousGRoot: '0000000000000000000000000000000000000000000000000000000000000000',
        reason: 'I am a fork.',
        signatures: []
    } as GovernanceReceipt;
    
    const err = localFed.applyGovernanceReceipt(badReceipt);
    if (err && err.includes('Lineage breach')) {
        console.log('    ✅ Correctly detected Lineage Breach.');
    } else {
        console.log('    ❌ FAILED to detect Lineage Breach.');
    }

    // 5. Test Epoch Mismatch
    console.log('[5] Testing Epoch Mismatch...');
    const epochMismatchReceipt = {
        ...badReceipt,
        previousGRoot: localFed.getGovernanceRoot(),
        epochId: 0 // Should be 1
    } as GovernanceReceipt;
    
    const err2 = localFed.applyGovernanceReceipt(epochMismatchReceipt);
    if (err2 && err2.includes('Epoch mismatch')) {
        console.log('    ✅ Correctly detected Epoch Mismatch.');
    } else {
        console.log('    ❌ FAILED to detect Epoch Mismatch.');
    }

    // 6. Test Finality (Auditor)
    console.log('[6] Testing Auditor (Institutional Finality)...');
    // Start a witness to sign a receipt anchored to Epoch 1
    const witness = spawn('npx', ['tsx', 'packages/ztan-witness/src/index.ts'], {
        env: { ...process.env, WITNESS_DIR: path.join(PROJECT_ROOT, '.ztan-witness-test'), PORT: '8085' }
    });
    
    await new Promise(r => setTimeout(r, 3000)); // wait for witness

    try {
        const missionId = 'INSTITUTIONAL_TEST_' + Date.now();
        const response = await axios.post('http://localhost:8085/witness/receipt', {
            missionId,
            chainRoot: 'root',
            tailHash: 'tail',
            governanceReceipt: transitionReceipt,
            signerKeyId: 'op'
        });
        
        const witnessReceipt = response.data;
        console.log(`    ✓ Witness anchored to Epoch: ${witnessReceipt.governanceEpoch}, Root: ${witnessReceipt.governanceRoot.slice(0, 8)}...`);
        
        const traceFile = path.join(TRACE_DIR, `${missionId}.trace.json`);
        fs.writeFileSync(traceFile, JSON.stringify({ missionId, events: [], witnesses: [witnessReceipt] }, null, 2));
        
        console.log('    [6.1] Running audit...');
        const audit = spawn('npx', ['tsx', 'scripts/replay-verify.ts', traceFile], { shell: true });
        let output = '';
        audit.stdout.on('data', d => output += d.toString());
        await new Promise(r => audit.on('close', r));
        
        if (output.includes('Governance state anchor verified') && output.includes('PASS')) {
            console.log('    ✅ Auditor verified institutional anchor.');
        } else {
            console.log('    ❌ Auditor FAILED to verify institutional anchor.');
            console.log(output);
        }

    } finally {
        witness.kill();
    }

    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  PHASE 11 SIMULATION COMPLETE                               ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');
}

main().catch(console.error);
