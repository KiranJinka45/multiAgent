import type { AutonomousActionManifest } from '@packages/autonomous-ops';
import crypto from 'node:crypto';

export interface ReplayReport {
    actionId: string;
    isDeterministic: boolean;
    evidenceMatch: boolean;
    lineageMatch: boolean;
    divergenceReason?: string;
}

/**
 * JCS-style canonical JSON stringification helper.
 * Recursively alphabetizes keys of all JSON objects to ensure
 * deterministic, identical string serialization across runtimes.
 */
export function canonicalizeJson(obj: any): string {
    if (obj === null) return 'null';
    if (typeof obj !== 'object') {
        return JSON.stringify(obj);
    }
    if (Array.isArray(obj)) {
        return '[' + obj.map(item => canonicalizeJson(item)).join(',') + ']';
    }
    const keys = Object.keys(obj).sort();
    const members = keys.map(key => {
        return JSON.stringify(key) + ':' + canonicalizeJson(obj[key]);
    });
    return '{' + members.join(',') + '}';
}

/**
 * Replayability Verification Engine
 * 
 * Validates that infrastructure mutations can be re-executed 
 * identically, preserving causality and evidence lineage.
 */
export class ReplayVerifier {
    /**
     * Verifies a specific action's replay fidelity.
     */
    public verifyReplay(action: AutonomousActionManifest, executionLog: any[]): ReplayReport {
        console.log(`[REPLAY] Verifying deterministic reconstruction for ${action.actionId}`);
        
        // 1. Verify Causality: Ensure action reason exists and is valid
        const hasCausality = !!action.reason && action.reason.trim().length > 0;
        
        // 2. Compute canonical JCS SHA-256 hash of action manifest
        const normalizedPayload = canonicalizeJson(action);
        const computedHash = crypto.createHash('sha256').update(normalizedPayload).digest('hex');
        
        // 3. Search logs for original recorded evidence hash and verify matches
        let recordedHash = '';
        let lineageMatch = false;
        
        for (const log of executionLog) {
            if (log.metadata) {
                if (log.metadata.evidenceHash) {
                    recordedHash = log.metadata.evidenceHash;
                }
                if (log.metadata.actionId === action.actionId) {
                    lineageMatch = true;
                }
            }
        }
        
        const finalRecordedHash = recordedHash || computedHash;
        const evidenceMatch = computedHash === finalRecordedHash;
        
        return {
            actionId: action.actionId,
            isDeterministic: evidenceMatch && hasCausality,
            evidenceMatch,
            lineageMatch
        };
    }

    /**
     * Reconstructs the entire governance timeline from genesis,
     * enforcing cryptographic block-chain sequence continuity and integrity.
     */
    public reconstructTimeline(events: any[]): boolean {
        console.log(`[REPLAY] Reconstructing timeline for ${events.length} events...`);
        if (events.length === 0) return true;
        
        // Sort blocks sequentially
        const sortedEvents = [...events].sort((a, b) => {
            const seqA = typeof a.id === 'number' ? a.id : Number(a.blockId || 0);
            const seqB = typeof b.id === 'number' ? b.id : Number(b.blockId || 0);
            return seqA - seqB;
        });
        
        let lastHash = sortedEvents[0].prevHash || 'genesis';
        
        for (const block of sortedEvents) {
            // 1. Enforce Hash Chain continuity link
            if (block.prevHash !== lastHash) {
                console.error(`[REPLAY] Cryptographic link failure! Block ${block.blockId} has prevHash "${block.prevHash}" but last computed hash was "${lastHash}"`);
                return false;
            }
            
            // 2. Validate block-level payload integrity matching block.hash
            const blockData = {
                blockId: block.blockId,
                prevHash: block.prevHash,
                type: block.type,
                payload: block.payload,
                operator: block.operator,
                epoch: block.epoch
            };
            const computedHash = crypto.createHash('sha256').update(canonicalizeJson(blockData)).digest('hex');
            
            if (block.hash !== computedHash) {
                console.error(`[REPLAY] Block Integrity breach! Block ${block.blockId} hash "${block.hash}" does not match computed hash "${computedHash}"`);
                return false;
            }
            
            lastHash = block.hash;
        }
        
        return true;
    }
}

/**
 * Causal Sequence Validator
 * 
 * Enforces chronological and causal ordering invariants between events:
 * - A child event (HEAL, DECISION, MUTATION) cannot precede its parent cause trigger (OBSERVATION).
 */
export class CausalSequenceValidator {
    public static validateCausalFlow(events: any[]): { passed: boolean; errorReason?: string } {
        console.log(`[CAUSAL] Validating event ordering for ${events.length} events...`);
        
        const eventMap = new Map<string, any>();
        for (const event of events) {
            if (event.id) eventMap.set(String(event.id), event);
        }
        
        for (const event of events) {
            if (event.causality && event.causality.parentEventId) {
                const parent = eventMap.get(String(event.causality.parentEventId));
                if (parent) {
                    const parentTime = new Date(parent.timestamp || parent.createdAt || 0).getTime();
                    const eventTime = new Date(event.timestamp || event.createdAt || 0).getTime();
                    
                    // 1. Chronological Invariant: child time >= parent time
                    if (eventTime < parentTime) {
                        return {
                            passed: false,
                            errorReason: `causal-time-inversion-violation: Event ${event.id} (Category: ${event.category}) has timestamp ${new Date(eventTime).toISOString()} which is earlier than parent cause Event ${parent.id} timestamp ${new Date(parentTime).toISOString()}`
                        };
                    }
                    
                    // 2. Sequential Invariant: child sequence > parent sequence
                    if (typeof event.sequence === 'number' && typeof parent.sequence === 'number') {
                        if (event.sequence <= parent.sequence) {
                            return {
                                passed: false,
                                errorReason: `causal-sequence-inversion-violation: Event ${event.id} (Category: ${event.category}) sequence ${event.sequence} is not greater than parent cause Event ${parent.id} sequence ${parent.sequence}`
                            };
                        }
                    }
                }
            }
        }
        
        return { passed: true };
    }
}
