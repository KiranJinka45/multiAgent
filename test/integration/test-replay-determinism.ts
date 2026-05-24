import { 
    ReplayVerifier, 
    CausalSequenceValidator, 
    canonicalizeJson 
} from '../../packages/production-pilot/src/replay.js';
import { 
    runHarnessTests 
} from '../../packages/utils/src/transparency/replay-validation-harness.js';
import crypto from 'node:crypto';
import { logger } from '../../packages/observability/src/index.js';
import type { AutonomousActionManifest } from '@packages/autonomous-ops';

class ReplayDeterminismStressTester {
    async run() {
        logger.info('🏁 [TEST] Starting REPLAY DETERMINISM & EVENT ORDERING TEST CAMPAIGN');
        let passed = 0;
        let total = 0;

        const verifier = new ReplayVerifier();

        // ─── Scenario 1: Deterministic Replay Hash Verification ───
        total++;
        logger.info('🛡️  [Scenario 1] Verifying JCS-style Action Replay Determinism...');
        try {
            const action: AutonomousActionManifest = {
                actionId: 'act-rebalance-09',
                type: 'REBALANCE',
                targetId: 'node-us-east-4',
                reason: 'Resource utilization crossed high-threshold SLA constraint',
                metadata: {
                    autoRollback: true,
                    workingDir: '/var/ztan/rebalance'
                },
                blastRadius: {
                    score: 0.12,
                    affectedNodes: ['node-us-east-4-a', 'node-us-east-4-b']
                },
                rollbackPlan: {
                    method: 'STATE_REVERT',
                    preCheckId: 'chk-preflight-98'
                },
                approvalStatus: 'AUTO_APPROVED',
                executionStatus: 'COMPLETED'
            };

            const normalized = canonicalizeJson(action);
            const actionHash = crypto.createHash('sha256').update(normalized).digest('hex');

            // 1. Valid Replay Report
            const validReport = verifier.verifyReplay(action, [
                {
                    stage: 'EXECUTION',
                    status: 'success',
                    metadata: {
                        actionId: action.actionId,
                        evidenceHash: actionHash
                    }
                }
            ]);

            // 2. Tampered Replay Report
            const invalidReport = verifier.verifyReplay(action, [
                {
                    stage: 'EXECUTION',
                    status: 'success',
                    metadata: {
                        actionId: action.actionId,
                        evidenceHash: '0xbrokenhash12345'
                    }
                }
            ]);

            if (validReport.isDeterministic === true && 
                validReport.evidenceMatch === true && 
                validReport.lineageMatch === true && 
                invalidReport.isDeterministic === false && 
                invalidReport.evidenceMatch === false) {
                logger.info('  ✅ PASS: Action replay determinism matches JCS digests and lineage logs');
                passed++;
            } else {
                throw new Error('Deterministic validation failed');
            }
        } catch (e: any) {
            logger.error({ error: e.message }, '  ❌ FAIL: Exception in Scenario 1');
        }

        // ─── Scenario 2: Cryptographic Block Chain Reconstruction & Tamper Detection ───
        total++;
        logger.info('⛓️  [Scenario 2] Verifying Cryptographic Block Chain Continuity...');
        try {
            // Helper to generate blocks
            const makeBlock = (id: number, prevHash: string, payload: string) => {
                const blockData = {
                    blockId: String(id),
                    prevHash,
                    type: 'MUTATION',
                    payload,
                    operator: 'steward-node-01',
                    epoch: '2026-ROTATION-01'
                };
                const hash = crypto.createHash('sha256').update(canonicalizeJson(blockData)).digest('hex');
                return {
                    id,
                    ...blockData,
                    hash
                };
            };

            const b1 = makeBlock(1, 'genesis', 'Deploy app core-v1');
            const b2 = makeBlock(2, b1.hash, 'Scale replica count to 3');
            const b3 = makeBlock(3, b2.hash, 'Rebalance network ingress route');

            const validChain = [b1, b2, b3];

            // 1. Test Valid Chain Reconstruction
            const validOk = verifier.reconstructTimeline(validChain);
            if (!validOk) {
                throw new Error('Valid block chain timeline failed reconstruction');
            }

            // 2. Test Block Tampering Detection
            const tamperedChain = [
                b1,
                { ...b2, payload: 'Scale replica count to 99' }, // Payload altered!
                b3
            ];
            const tamperedOk = verifier.reconstructTimeline(tamperedChain);

            // 3. Test Link Failure Detection
            const linkFailedChain = [
                b1,
                b2,
                { ...b3, prevHash: '0xbrokenhash12345' } // PrevHash linkage altered!
            ];
            const linkOk = verifier.reconstructTimeline(linkFailedChain);

            if (validOk === true && tamperedOk === false && linkOk === false) {
                logger.info('  ✅ PASS: Hash chain and link anomalies successfully caught by reconstruction engine');
                passed++;
            } else {
                throw new Error(`Chain anomalies bypass check: validOk=${validOk}, tamperedOk=${tamperedOk}, linkOk=${linkOk}`);
            }
        } catch (e: any) {
            logger.error({ error: e.message }, `  ❌ FAIL: Scenario 2 Exception: ${e.message}`);
        }

        // ─── Scenario 3: Causal Event Sequence Ordering Invariants ───
        total++;
        logger.info('⏳ [Scenario 3] Testing Causal Sequence & Timestamp Ordering...');
        try {
            const baseTime = Date.now();
            
            const eventObs = {
                id: 'evt-observation-01',
                category: 'observation',
                timestamp: new Date(baseTime).toISOString(),
                sequence: 101,
            };

            const eventDec = {
                id: 'evt-decision-01',
                category: 'decision',
                timestamp: new Date(baseTime + 5000).toISOString(), // 5s later
                sequence: 102,
                causality: {
                    parentEventId: 'evt-observation-01',
                    linkType: 'trigger',
                    confidence: 1.0
                }
            };

            const eventHeal = {
                id: 'evt-heal-01',
                category: 'heal',
                timestamp: new Date(baseTime + 10000).toISOString(), // 10s later
                sequence: 103,
                causality: {
                    parentEventId: 'evt-decision-01',
                    linkType: 'remediation',
                    confidence: 1.0
                }
            };

            const validFlow = [eventObs, eventDec, eventHeal];

            // 1. Assert Valid Flow passes
            const validRes = CausalSequenceValidator.validateCausalFlow(validFlow);
            if (!validRes.passed) {
                throw new Error(`Valid causal flow rejected: ${validRes.errorReason}`);
            }

            // 2. Inject Timing Inversion (Heal occurs BEFORE Decision)
            const invertedHeal = {
                ...eventHeal,
                timestamp: new Date(baseTime + 2000).toISOString() // BEFORE Decision (baseTime + 5000)
            };
            const timeInvertedFlow = [eventObs, eventDec, invertedHeal];
            const timeRes = CausalSequenceValidator.validateCausalFlow(timeInvertedFlow);

            // 3. Inject Sequence Inversion (Heal sequence <= Decision sequence)
            const seqInvertedHeal = {
                ...eventHeal,
                sequence: 102 // equal to Decision
            };
            const seqInvertedFlow = [eventObs, eventDec, seqInvertedHeal];
            const seqRes = CausalSequenceValidator.validateCausalFlow(seqInvertedFlow);

            if (validRes.passed === true && 
                timeRes.passed === false && 
                timeRes.errorReason?.includes('causal-time-inversion-violation') &&
                seqRes.passed === false && 
                seqRes.errorReason?.includes('causal-sequence-inversion-violation')) {
                logger.info('  ✅ PASS: Causal sequence and timing inversions caught by validator successfully');
                passed++;
            } else {
                throw new Error(`Inversions bypassed checks: valid=${validRes.passed}, timeRes=${JSON.stringify(timeRes)}, seqRes=${JSON.stringify(seqRes)}`);
            }
        } catch (e: any) {
            logger.error({ error: e.message }, `  ❌ FAIL: Scenario 3 Exception: ${e.message}`);
        }

        // ─── Scenario 4: Streaming Tokenizer, JCS, and Shrinking Harness ───
        total++;
        logger.info('📦 [Scenario 4] Running JCS Streaming & Delta-Debugging harness checks...');
        try {
            // Trigger the streaming parser harness self-test suite
            runHarnessTests();
            logger.info('  ✅ PASS: JCS streaming tokenizer and delta-debugging shrinker verified');
            passed++;
        } catch (e: any) {
            logger.error({ error: e.message }, `  ❌ FAIL: Scenario 4 Exception: ${e.message}`);
        }

        logger.info(`🏁 [TEST] COMPLETED: ${passed}/${total} Scenarios Passed.`);
        if (passed !== total) {
            throw new Error(`Replay Determinism Stress Test Failed: only ${passed}/${total} passed.`);
        }
        logger.info('🎉 [SYSTEM DETERMINISTIC] All replay, event ordering, and causal integrity validation loops are fully functional.');
    }
}

const tester = new ReplayDeterminismStressTester();
tester.run()
    .then(() => {
        process.exit(0);
    })
    .catch(err => {
        console.error('Fatal replay test failure:', err.message);
        process.exit(1);
    });
