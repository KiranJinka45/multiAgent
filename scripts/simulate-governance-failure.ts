import { MerkleTree } from '../packages/utils/src/transparency/merkle';
import { GovernanceReceipt, GovernanceSignature, CouncilMember, governanceSignablePayload } from '../packages/utils/src/transparency/governance';
import { WitnessFederation, WitnessMember } from '../packages/utils/src/transparency/witness-federation';
import { GovernanceCoordinator, GovernanceCouncilMember } from '../packages/utils/src/transparency/governance-authority';
import { GovernanceConsensus } from '../packages/utils/src/transparency/governance-consensus';
import { EmergencyRecoveryCoordinator } from '../packages/utils/src/transparency/recovery';
import { LocalSigner } from '../packages/utils/src/transparency/signer';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

/**
 * 🧪 Governance Failure & Recovery Simulation
 * Validates the Phase 11 Hardening:
 * 1. Consensus-driven proposals.
 * 2. Merkle-anchored log chaining.
 * 3. Witness-led emergency recovery (Bypass).
 */
async function runSimulation() {
    console.log('🚀 Starting ZTAN Institutional Governance Simulation...');

    const tempDir = path.join(process.cwd(), '.ztan-temp-sim');
    if (fs.existsSync(tempDir)) fs.rmSync(tempDir, { recursive: true });
    fs.mkdirSync(tempDir, { recursive: true });

    // 1. Setup Initial State (4 Witnesses)
    console.log('\n--- Phase 1: Setup ---');
    const witnessKeys = [1, 2, 3, 4].map(() => crypto.generateKeyPairSync('ed25519'));
    const witnesses: WitnessMember[] = witnessKeys.map((k, i) => ({
        id: crypto.createHash('sha256').update(k.publicKey.export({ type: 'spki', format: 'pem' }) as string).digest('hex'),
        publicKey: k.publicKey.export({ type: 'spki', format: 'pem' }) as string,
        url: `http://localhost:808${i}`
    }));

    const federation = new WitnessFederation(witnesses, 3);
    const coordinator = new GovernanceCoordinator(tempDir);
    
    // Initial Council (Node 1 and Node 2)
    const councilMembers = [
        new GovernanceCouncilMember(path.join(tempDir, 'council-1')),
        new GovernanceCouncilMember(path.join(tempDir, 'council-2'))
    ];
    const consensus = new GovernanceConsensus({
        members: councilMembers.map(m => ({ id: m.getKeyId(), publicKey: m.getPublicKeyPem() })),
        threshold: 2
    });

    console.log(`Council initialized with ${councilMembers.length} members (Threshold: 2)`);

    // 2. Normal Proposal (Consensus Flow)
    console.log('\n--- Phase 2: Normal Consensus Flow ---');
    const { epochId, lastSeq, gRoot: prevGRoot } = coordinator.getEpochContext();
    
    const proposal = consensus.propose({
        id: 'prop-1',
        action: 'THRESHOLD_UPDATE',
        params: {
            newThreshold: 3,
            reason: 'Security hardening',
            effectiveTimestamp: new Date().toISOString()
        },
        sequenceNumber: lastSeq + 1,
        epochId: epochId,
        previousGRoot: prevGRoot
    });

    // Cast votes
    console.log('Casting council votes...');
    for (const m of councilMembers) {
        const sig = await m.signProposal(proposal as any);
        consensus.castVote(proposal.id, sig.signerKeyId, sig.signature);
    }

    if (consensus.isReady(proposal.id)) {
        console.log('Proposal ready. Calculating new gRoot...');
        const simTree = new MerkleTree();
        const payload = {
            action: proposal.action,
            ...proposal.params,
            sequenceNumber: proposal.sequenceNumber,
            epochId: proposal.epochId,
            previousGRoot: proposal.previousGRoot,
            effectiveTimestamp: proposal.params.effectiveTimestamp,
            reason: proposal.params.reason
        };
        simTree.append(MerkleTree.hashLeaf(JSON.stringify(payload, Object.keys(payload).sort())));
        const newGRoot = simTree.getRoot();
        
        const receipt = consensus.commit(proposal.id, newGRoot);
        if (typeof receipt !== 'string') {
            coordinator.commitReceipt(receipt);
            const err = federation.applyGovernanceReceipt(receipt);
            if (!err) console.log('✅ THRESHOLD_UPDATE committed and applied via consensus.');
            else console.error('❌ Failed to apply receipt:', err);
        }
    }

    // 3. Stalled Council & Emergency Recovery
    console.log('\n--- Phase 3: Emergency Recovery (Council Bypass) ---');
    console.log('Simulating lost council keys. Witnesses initiating recovery...');

    const recoveryNewCouncil = {
        members: [{ id: 'new-admin-1', publicKey: '...' }],
        threshold: 1
    };

    const { epochId: recEpoch, lastSeq: recSeq, gRoot: recRoot } = coordinator.getEpochContext();
    const recoveryParams = {
        newCouncil: recoveryNewCouncil,
        epochId: recEpoch,
        sequenceNumber: recSeq + 1,
        previousGRoot: recRoot,
        effectiveTimestamp: new Date().toISOString(),
        reason: 'Original council keys lost in catastrophic failure.'
    };

    // Witnesses sign recovery proposal (Need 3/4)
    const recoverySigs: GovernanceSignature[] = [];
    for (let i = 0; i < 3; i++) {
        const signer = new LocalSigner(
            witnessKeys[i].privateKey.export({ type: 'pkcs8', format: 'pem' }) as string,
            witnessKeys[i].publicKey.export({ type: 'spki', format: 'pem' }) as string
        );
        const sig = await EmergencyRecoveryCoordinator.signRecoveryProposal(recoveryParams, signer);
        recoverySigs.push(sig);
    }

    const recoveryReceipt = EmergencyRecoveryCoordinator.assembleRecoveryReceipt(recoveryParams, recoverySigs);
    
    // Rebuild tree to calculate correct root
    const recTree = new MerkleTree();
    const log = coordinator.loadGovernanceLog();
    for(const r of log) {
        recTree.append(MerkleTree.hashLeaf(governanceSignablePayload(r)));
    }
    const recPayload = {
        action: 'COUNCIL_RESET',
        newCouncil: recoveryParams.newCouncil,
        sequenceNumber: recoveryParams.sequenceNumber,
        epochId: recoveryParams.epochId,
        previousGRoot: recoveryParams.previousGRoot,
        effectiveTimestamp: recoveryParams.effectiveTimestamp,
        reason: recoveryParams.reason
    };
    recTree.append(MerkleTree.hashLeaf(JSON.stringify(recPayload, Object.keys(recPayload).sort())));
    recoveryReceipt.gRoot = recTree.getRoot();

    const recErr = federation.applyGovernanceReceipt(recoveryReceipt);
    if (!recErr) {
        console.log('✅ EMERGENCY_RESET successful! Council bypassed by witnesses.');
        console.log(`Institutional Epoch advanced to: ${federation.getEpochId()}`);
    } else {
        console.error('❌ Recovery failed:', recErr);
    }

    console.log('\n--- Simulation Summary ---');
    console.log(`Witness Federation Size: ${federation.getMembers().length}`);
    console.log(`Governance Epoch: ${federation.getEpochId()}`);
    console.log(`Governance Root: ${federation.getGovernanceRoot().slice(0, 16)}...`);
    
    fs.rmSync(tempDir, { recursive: true });
}

runSimulation().catch(console.error);
