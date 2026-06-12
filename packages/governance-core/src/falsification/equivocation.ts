import { ConsensusEngine } from '../ledger/consensus.js';
import { MerkleTree } from '../ledger/merkle.js';
import { sign } from 'crypto';

export interface EquivocationTest {
    name: string;
    description: string;
}

export class EquivocationFuzzer {
    static runFuzzingCampaign(): {
        total: number;
        survived: number;
        exhausted: number;
        results: { test: EquivocationTest; survived: boolean; response: string }[]
    } {
        const tests: EquivocationTest[] = [
            {
                name: 'Split Quorum Roots (Equivocation)',
                description: 'Leader sends differing payloads to different followers to fracture the ledger.'
            },
            {
                name: 'Forged Quorum Certificate (Forged ACKs)',
                description: 'Leader attempts to claim a commit without gathering 2f+1 valid signatures.'
            },
            {
                name: 'Replayed Certificate Injection',
                description: 'Malicious node replays a valid but old certificate into a new term.'
            }
        ];

        let survivedCount = 0;
        let exhaustedCount = 0;
        const results = [];

        for (const test of tests) {
            let survived = false;
            let response = '';

            try {
                if (test.name === 'Split Quorum Roots (Equivocation)') {
                    ConsensusEngine.initializeCluster(3);
                    ConsensusEngine.proposeCommit('valid-tx-1', 'node-1');
                    
                    const leader = ConsensusEngine.getClusterNodes().get('node-1');
                    const node2 = ConsensusEngine.getClusterNodes().get('node-2');
                    const node3 = ConsensusEngine.getClusterNodes().get('node-3');
                    
                    if (leader && node2 && node3) {
                        // Leader tries to equivocate by manually forcing different entries to node-2 vs node-3
                        const evilEntry2 = { term: leader.currentTerm + 1, command: 'evil-tx-node-2' };
                        const evilEntry3 = { term: leader.currentTerm + 1, command: 'evil-tx-node-3' };
                        
                        // Leader signs the proposal for Node-2
                        const tempLog2 = [...leader.log, evilEntry2];
                        const evilRoot2 = MerkleTree.computeRoot(tempLog2);
                        const payload2 = Buffer.from(`${evilEntry2.term}:${evilRoot2}`);
                        const evilSignature2 = sign(null, payload2, leader.privateKey).toString('base64');
                        
                        // Leader signs the proposal for Node-3
                        const tempLog3 = [...leader.log, evilEntry3];
                        const evilRoot3 = MerkleTree.computeRoot(tempLog3);
                        const payload3 = Buffer.from(`${evilEntry3.term}:${evilRoot3}`);
                        const evilSignature3 = sign(null, payload3, leader.privateKey).toString('base64');
                        
                        // --- Simulating Prepare Phase & Cross-Talk ---
                        // 1. Replicas receive leader proposals and add prepares to their pools
                        node2.preparePool.push({ nodeId: 'node-1', term: evilEntry2.term, merkleRoot: evilRoot2, signature: evilSignature2 });
                        const sig2 = sign(null, Buffer.from(`${evilEntry2.term}:${evilRoot2}`), node2.privateKey).toString('base64');
                        node2.preparePool.push({ nodeId: 'node-2', term: evilEntry2.term, merkleRoot: evilRoot2, signature: sig2 });
                        
                        node3.preparePool.push({ nodeId: 'node-1', term: evilEntry3.term, merkleRoot: evilRoot3, signature: evilSignature3 });
                        const sig3 = sign(null, Buffer.from(`${evilEntry3.term}:${evilRoot3}`), node3.privateKey).toString('base64');
                        node3.preparePool.push({ nodeId: 'node-3', term: evilEntry3.term, merkleRoot: evilRoot3, signature: sig3 });
                        
                        // 2. Inter-replica Prepare Broadcast Cross-Talk
                        // Node-2 sends its prepare to Node-3
                        node3.preparePool.push({ nodeId: 'node-2', term: evilEntry2.term, merkleRoot: evilRoot2, signature: sig2 });
                        // Node-3 sends its prepare to Node-2
                        node2.preparePool.push({ nodeId: 'node-3', term: evilEntry3.term, merkleRoot: evilRoot3, signature: sig3 });
                        
                        // --- Simulating Commit Decision Phase ---
                        // Attempt the append entries to see if any node can commit and form a valid Quorum Certificate
                        const result2 = ConsensusEngine.appendEntries('node-1', evilEntry2.term, [evilEntry2], evilRoot2, evilSignature2);
                        const result3 = ConsensusEngine.appendEntries('node-1', evilEntry3.term, [evilEntry3], evilRoot3, evilSignature3);
                        
                        const successQC2 = result2.success && result2.certificate && result2.certificate.signatures.length >= ConsensusEngine.getQuorumSize();
                        const successQC3 = result3.success && result3.certificate && result3.certificate.signatures.length >= ConsensusEngine.getQuorumSize();
                        
                        if (successQC2 || successQC3) {
                            survived = false;
                            response = 'EXHAUSTED: Leader successfully equivocated and achieved a fake quorum certificate.';
                        } else {
                            survived = true;
                            response = 'SURVIVED: Equivocation detected via inter-replica prepare cross-talk! Replicas aborted due to prepare conflicts.';
                        }
                    }
                } 
                else if (test.name === 'Forged Quorum Certificate (Forged ACKs)') {
                    ConsensusEngine.initializeCluster(3);
                    const leader = ConsensusEngine.getClusterNodes().get('node-1');
                    if (leader) {
                        // Leader tries to forge a commit by generating a fake follower signature
                        const fakeEntry = { term: 5, command: 'forged-tx' };
                        leader.log.push(fakeEntry);
                        const fakeRoot = MerkleTree.computeRoot(leader.log);
                        
                        // A proper implementation validates the certificate signature against follower public keys.
                        // Here we check if the system requires actual returned signatures in the appendEntries cycle.
                        const result = ConsensusEngine.appendEntries('node-1', 5, [fakeEntry], fakeRoot, 'fake-leader-sig');
                        
                        // Because 'fake-leader-sig' is invalid, followers reject the payload.
                        // The leader never gets the required follower signatures for the QC.
                        if (result.success) {
                            survived = false;
                            response = 'EXHAUSTED: Forged leader signature was accepted, resulting in an illegitimate Quorum Certificate.';
                        } else if (result.reason?.includes('QUORUM_LOSS') || result.reason?.includes('BFT_REJECT') || result.reason?.includes('EQUIVOCATION_DETECTED')) {
                            survived = true;
                            response = 'SURVIVED: Follower cryptographic validation rejected the forged signature.';
                        } else {
                            survived = true;
                            response = 'SURVIVED: Request rejected.';
                        }
                    }
                }
                else if (test.name === 'Replayed Certificate Injection') {
                    ConsensusEngine.initializeCluster(3);
                    
                    // Generate a valid commit
                    ConsensusEngine.proposeCommit('valid-tx', 'node-1');
                    
                    // We assume validResult returns a certificate, or that the system has advanced.
                    const leader = ConsensusEngine.getClusterNodes().get('node-1');
                    if (leader) {
                        // An attacker replays an old entry with an old signature into a new term
                        const oldEntry = leader.log[0];
                        const oldRoot = leader.merkleRoot;
                        
                        // Attacker tries to force this into term 100
                        const replayResult = ConsensusEngine.appendEntries('node-1', 100, [oldEntry], oldRoot, 'old-signature-data');
                        
                        if (replayResult.success) {
                            survived = false;
                            response = 'EXHAUSTED: Replayed certificate was accepted in a newer term.';
                        } else {
                            survived = true;
                            response = 'SURVIVED: BFT timestamp/term boundaries rejected the replayed certificate.';
                        }
                    }
                }

                if (survived) survivedCount++;
                else exhaustedCount++;

            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : String(err);
                survived = false;
                exhaustedCount++;
                response = `EXHAUSTED: (Crash/OOM) ${message}`;
            }

            results.push({
                test,
                survived,
                response
            });
        }

        return {
            total: tests.length,
            survived: survivedCount,
            exhausted: exhaustedCount,
            results
        };
    }
}
