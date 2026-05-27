/**
 * ZTAN Phase Ω.2 - Detached Witness Anchor
 * 
 * DESIGN CONSTRAINTS:
 * 1. Passive Merkle root exporting and external notarization formatting.
 * 2. Enforces append-only witness ledger tracking.
 * 3. Bounded, advisory reports only. No autonomous recovery loops.
 */

import crypto from 'crypto';
import { ChainedTelemetryEvent } from '../chronology/evidence-authenticator.js';

export interface MerkleRootExport {
    taskId: string;
    timestamp: number;
    merkleRoot: string;
    chainedLength: number;
    signature: string;
    signerId: string;
}

export interface WitnessAnchorRecord {
    recordId: string;
    timestamp: number;
    merkleRootExport: MerkleRootExport;
    previousRecordHash: string;
    recordHash: string;
}

export interface DetachedWitnessReport {
    checksPassed: boolean;
    violations: string[];
    ledgerLength: number;
    chainIntegrityVerified: boolean;
    analysisTimestamp: number;
}

export class DetachedWitnessAnchor {
    
    /**
     * Periodically computes the Merkle Root hash representing the cumulative
     * state of a chained telemetry timeline and signs it for detached notarization.
     */
    public exportMerkleRoot(
        taskId: string,
        chainedEvents: ChainedTelemetryEvent[],
        signerId: string,
        privateKeyOrSecret: string
    ): MerkleRootExport {
        if (chainedEvents.length === 0) {
            throw new Error('Cannot export Merkle root for empty telemetry timelines.');
        }

        // The Merkle root of a hash-chained sequence is the hash of the terminal event block
        // as it transitively encapsulates the cryptographic lineage of all preceding blocks.
        const terminalEvent = chainedEvents[chainedEvents.length - 1];
        const merkleRoot = terminalEvent.hash;

        // Compute provenance signature over the Merkle root
        const preimage = `${taskId}${merkleRoot}${chainedEvents.length}${signerId}`;
        const signature = crypto.createHmac('sha256', privateKeyOrSecret).update(preimage).digest('hex');

        return {
            taskId,
            timestamp: Date.now(),
            merkleRoot,
            chainedLength: chainedEvents.length,
            signature,
            signerId
        };
    }

    /**
     * Enforces the local append-only witness ledger structure.
     * Binds the new export to the cryptographic hash of the previous ledger entry.
     */
    public appendToLedger(
        rootExport: MerkleRootExport,
        currentLedger: WitnessAnchorRecord[]
    ): WitnessAnchorRecord {
        const recordId = `rec-${crypto.randomBytes(8).toString('hex')}`;
        const timestamp = Date.now();
        
        let previousRecordHash = '0'.repeat(64);
        if (currentLedger.length > 0) {
            previousRecordHash = currentLedger[currentLedger.length - 1].recordHash;
        }

        // Record Preimage: id || prevHash || JSON(export)
        const exportStr = JSON.stringify(rootExport);
        const preimage = `${recordId}${previousRecordHash}${exportStr}`;
        const recordHash = crypto.createHash('sha256').update(preimage).digest('hex');

        return {
            recordId,
            timestamp,
            merkleRootExport: rootExport,
            previousRecordHash,
            recordHash
        };
    }

    /**
     * Validates an entire offline witness ledger for insertion, deletion, modification,
     * or historical tampering. Highly durable advisory verifier.
     */
    public verifyLedgerIntegrity(
        ledger: WitnessAnchorRecord[],
        publicKeyOrSecret: string
    ): DetachedWitnessReport {
        const violations: string[] = [];
        let chainIntegrityVerified = true;
        let expectedPrevHash = '0'.repeat(64);

        for (let i = 0; i < ledger.length; i++) {
            const rec = ledger[i];

            // 1. Verify previous hash continuity
            if (rec.previousRecordHash !== expectedPrevHash) {
                chainIntegrityVerified = false;
                violations.push(`Ledger continuity broken at index ${i}. Expected previous hash: '${expectedPrevHash}', Got: '${rec.previousRecordHash}'`);
            }

            // 2. Verify record hash integrity
            const exportStr = JSON.stringify(rec.merkleRootExport);
            const preimage = `${rec.recordId}${rec.previousRecordHash}${exportStr}`;
            const recomputedHash = crypto.createHash('sha256').update(preimage).digest('hex');

            if (rec.recordHash !== recomputedHash) {
                chainIntegrityVerified = false;
                violations.push(`Record hash mismatch at index ${i}. Recomputed: '${recomputedHash}', Stored: '${rec.recordHash}'`);
            }

            // 3. Verify detached witness signature provenance
            const rootExp = rec.merkleRootExport;
            const sigPreimage = `${rootExp.taskId}${rootExp.merkleRoot}${rootExp.chainedLength}${rootExp.signerId}`;
            const expectedSig = crypto.createHmac('sha256', publicKeyOrSecret).update(sigPreimage).digest('hex');

            if (rootExp.signature !== expectedSig) {
                chainIntegrityVerified = false;
                violations.push(`Witness signature invalid at ledger index ${i} for signer: '${rootExp.signerId}'`);
            }

            expectedPrevHash = rec.recordHash;
        }

        const checksPassed = violations.length === 0 && chainIntegrityVerified;

        return {
            checksPassed,
            violations,
            ledgerLength: ledger.length,
            chainIntegrityVerified,
            analysisTimestamp: Date.now()
        };
    }

    /**
     * Formats the signed Merkle Root export into a standardized portable base64 notarization payload.
     * This payload can be safely timestamped or anchored into any civilization-scale public ledger (RFC 3161 etc.)
     */
    public generateExternalAnchorPayload(rootExport: MerkleRootExport): string {
        const jsonStr = JSON.stringify(rootExport);
        return Buffer.from(jsonStr).toString('base64');
    }
}
