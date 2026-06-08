import { describe, it, expect, beforeEach, vi } from 'vitest';

const store = new Map<string, string>();
const lists = new Map<string, string[]>();
const sets = new Map<string, Set<string>>();
let seq = 0;

const mockRedis = {
    get: vi.fn(async (key: string) => store.get(key) || null),
    set: vi.fn(async (key: string, value: string) => { store.set(key, value); }),
    del: vi.fn(async (...keys: string[]) => { keys.forEach(k => { store.delete(k); lists.delete(k); sets.delete(k); }); }),
    keys: vi.fn(async (_pat: string) => Array.from(store.keys()).filter(k => k.startsWith('ztan:'))),
    sadd: vi.fn(async (key: string, val: string) => { if(!sets.has(key)) sets.set(key, new Set()); sets.get(key)!.add(val); }),
    sismember: vi.fn(async (key: string, val: string) => sets.get(key)?.has(val) ? 1 : 0),
    lrange: vi.fn(async (key: string, start: number, stop: number) => lists.get(key)?.slice(start, stop === -1 ? undefined : stop + 1) || []),
    rpush: vi.fn(async (key: string, ...vals: string[]) => { if(!lists.has(key)) lists.set(key, []); lists.get(key)!.push(...vals); }),
    lpush: vi.fn(async (key: string, ...vals: string[]) => { if(!lists.has(key)) lists.set(key, []); lists.get(key)!.unshift(...vals); }),
    incr: vi.fn(async (key: string) => { seq++; store.set(key, String(seq)); return seq; }),
    pipeline: vi.fn(() => {
        const pipelineInstance = {
            set: vi.fn((k: string, v: string) => { store.set(k, v); return pipelineInstance; }),
            rpush: vi.fn((k: string, ...vs: string[]) => { if(!lists.has(k)) lists.set(k, []); lists.get(k)!.push(...vs); return pipelineInstance; }),
            exec: vi.fn(async () => [])
        };
        return pipelineInstance;
    })
};

vi.mock('@packages/utils', () => {
    return { redis: mockRedis };
});

vi.mock('@packages/observability', () => {
    return {
        logger: {
            info: vi.fn(),
            warn: vi.fn(),
            error: vi.fn()
        },
        ztanWitnessAppendDuration: { observe: vi.fn() },
        ztanWitnessReplayDuration: { observe: vi.fn() },
        ztanWitnessQueueBacklog: { set: vi.fn() },
        ztanWitnessSignatureFailures: { inc: vi.fn() },
        ztanWitnessIngestionRejections: { inc: vi.fn() }
    };
});

vi.mock('@packages/db', () => {
    const mockZtanLedgerBlock = {
        findFirst: vi.fn(),
        create: vi.fn(),
        findMany: vi.fn(),
        delete: vi.fn(),
        update: vi.fn()
    };
    const mockZtanSnapshot = {
        upsert: vi.fn(),
        findFirst: vi.fn()
    };
    const mockDb = {
        ztanLedgerBlock: mockZtanLedgerBlock,
        ztanSnapshot: mockZtanSnapshot,
        $transaction: vi.fn(async (cb) => {
            return await cb({
                ztanLedgerBlock: mockZtanLedgerBlock,
                ztanSnapshot: mockZtanSnapshot,
                $executeRawUnsafe: vi.fn()
            });
        })
    };
    return { db: mockDb };
});

import { EvidenceLedgerService } from './index.js';
import { ForensicResilienceEngine } from './resilience-engine.js';
import { EventCategory, VerificationState } from '@packages/contracts';
import { redis } from '@packages/utils';

describe('ZTAN Evidence Ledger & Replay Engine - Integration Suite', () => {
    const correlationId = 'test-incident-xyz';

    beforeEach(async () => {
        // Clear all keys matching ztan:* to have a pristine test state
        const keys = await redis.keys('ztan:*');
        if (keys.length > 0) {
            await redis.del(...keys);
        }
    });

    // PRIORITY 1: Replay-chain verification tests
    it('should append events and reconstruct a valid, verified evidence chain', async () => {
        const entry1 = await EvidenceLedgerService.append({
            category: EventCategory.MUTATION,
            source: { service: 'auth-service', node: 'node-1', version: '2.4.0' },
            payload: { action: 'deploy', version: '2.4.0' },
            correlationId,
            signerId: 'operator-alice'
        });

        const entry2 = await EvidenceLedgerService.append({
            category: EventCategory.OBSERVATION,
            source: { service: 'auth-service', node: 'node-1', version: '2.4.0' },
            payload: { cpu: 92 },
            correlationId,
            parentEventId: entry1.id,
            signerId: 'operator-alice'
        });

        expect(entry1.sequence).toBe(1);
        expect(entry2.sequence).toBe(2);
        expect(entry2.integrity.previousHash).toBe(entry1.integrity.hash);

        const chain = await EvidenceLedgerService.getChain(correlationId);
        expect(chain.entries.length).toBe(2);
        expect(chain.verificationState).toBe(VerificationState.VERIFIED);
        expect(chain.metrics.chainIntegrityRate).toBe(1.0);
        expect(chain.metrics.evidenceCompleteness).toBe(1.0);
        expect(chain.metrics.causalCertainty).toBe(0.9); // because parentEventId was provided
    });

    // PRIORITY 2: Corrupted-hash rejection tests
    it('should reject a chain and mark it UNTRUSTED when hash linkage is corrupted', async () => {
        const entry1 = await EvidenceLedgerService.append({
            category: EventCategory.MUTATION,
            source: { service: 'auth-service', node: 'node-1', version: '2.4.0' },
            payload: { action: 'deploy' },
            correlationId,
            signerId: 'operator-alice'
        });

        const entry2 = await EvidenceLedgerService.append({
            category: EventCategory.OBSERVATION,
            source: { service: 'auth-service', node: 'node-1', version: '2.4.0' },
            payload: { cpu: 45 },
            correlationId,
            parentEventId: entry1.id,
            signerId: 'operator-alice'
        });

        // Inject hash corruption using ForensicResilienceEngine
        await ForensicResilienceEngine.injectChainCorruption(entry2.id);

        const chain = await EvidenceLedgerService.getChain(correlationId);
        expect(chain.verificationState).toBe(VerificationState.UNTRUSTED);
        expect(chain.metrics.chainIntegrityRate).toBe(0.5); // reduced due to untrusted state
        expect(chain.metrics.recoveryConfidence).toBe(0.6); // reduced confidence
    });

    // PRIORITY 3: Signer revocation tests
    it('should degrade chain trust level when a signer has been revoked', async () => {
        await EvidenceLedgerService.append({
            category: EventCategory.MUTATION,
            source: { service: 'gateway-service', node: 'node-2', version: '2.4.0' },
            payload: { action: 'config_change' },
            correlationId,
            signerId: 'compromised-signer-id'
        });

        // Verify initial state is VERIFIED
        let chain = await EvidenceLedgerService.getChain(correlationId);
        expect(chain.verificationState).toBe(VerificationState.VERIFIED);

        // Revoke the signer
        await ForensicResilienceEngine.revokeSigner('compromised-signer-id');

        // Verify state degrades to DEGRADED
        chain = await EvidenceLedgerService.getChain(correlationId);
        expect(chain.verificationState).toBe(VerificationState.DEGRADED);
        expect(chain.metrics.epochTrustValidity).toBe(0.3); // reduced epoch validity
    });

    // PRIORITY 4: Rollback lineage reconstruction tests
    it('should block unsafe rollbacks that violate baseline software versions or telemetry constraints', async () => {
        const unsafeEntry = await EvidenceLedgerService.append({
            category: EventCategory.MUTATION,
            source: { service: 'auth-service', node: 'node-1', version: '2.3.9' }, // below 2.4.0
            payload: { version: '2.3.9', action: 'rollback_target' },
            correlationId,
            signerId: 'operator-alice'
        });

        const assessment1 = await EvidenceLedgerService.assessRollbackImpact(unsafeEntry.id);
        expect(assessment1.isSafe).toBe(false);
        expect(assessment1.recommendation).toBe('PROHIBITED');
        expect(assessment1.violatedInvariants[0]).toContain('Unsafe software baseline');

        const telemetryMissingEntry = await EvidenceLedgerService.append({
            category: EventCategory.MUTATION,
            source: { service: 'auth-service', node: 'node-1', version: '2.4.0' },
            payload: { version: '2.4.0', dependency_health: 'MISSING' },
            correlationId,
            signerId: 'operator-alice'
        });

        const assessment2 = await EvidenceLedgerService.assessRollbackImpact(telemetryMissingEntry.id);
        expect(assessment2.isSafe).toBe(false);
        expect(assessment2.recommendation).toBe('PROHIBITED');
        expect(assessment2.violatedInvariants[0]).toContain('Mandatory dependency telemetry missing');
    });

    // PRIORITY 5: Concurrent append tests
    it('should sequence concurrent appends correctly maintaining monotonically increasing sequences', async () => {
        const appends = Array.from({ length: 10 }, (_, i) => 
            EvidenceLedgerService.append({
                category: EventCategory.MUTATION,
                source: { service: 'load-balancer', node: `node-${i}`, version: '2.4.0' },
                payload: { requestId: `req-${i}` },
                correlationId,
                signerId: 'operator-alice'
            })
        );

        const results = await Promise.all(appends);
        
        // Sequence numbers should be uniquely between 1 and 10
        const sequences = results.map((r: any) => r.sequence).sort((a: any, b: any) => a - b);
        expect(sequences).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

        // Verifies previous hashes chain sequentially
        for (let i = 1; i < results.length; i++) {
            const currentEntry = results.find((r: any) => r.sequence === i + 1);
            const prevEntry = results.find((r: any) => r.sequence === i);
            expect(currentEntry?.integrity.previousHash).toBe(prevEntry?.integrity.hash);
        }

        const chain = await EvidenceLedgerService.getChain(correlationId);
        expect(chain.entries.length).toBe(10);
        expect(chain.verificationState).toBe(VerificationState.VERIFIED);
    });
});
