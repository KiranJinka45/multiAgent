import * as crypto from 'crypto';
import { QuarantineError } from './witness.js';

export class TimeAnchorEngine {
    private static readonly TSA_KEY = process.env.ZTAN_TSA_KEY || crypto.randomBytes(32).toString('hex');
    private static readonly REKOR_ROOT = process.env.ZTAN_REKOR_ROOT || crypto.randomBytes(32).toString('hex');
    private static rekorLog: string[] = [];

    /**
     * Simulates requesting a cryptographically signed Time-Stamp Token (TST) from an external TSA.
     * Throws QuarantineError if clock drift exceeds 10 milliseconds.
     * @param payloadHash The hash of the ledger entry payload
     * @param simulatedDriftMs The clock drift to simulate between host and TSA
     */
    static getTsaTimestampToken(
        payloadHash: string,
        simulatedDriftMs: number = 0
    ): { token: string; timestamp: number } {
        const drift = Math.abs(simulatedDriftMs);

        // Enforce 10ms hard lockdown threshold
        if (drift > 10) {
            throw new QuarantineError(
                `CLOCK_DRIFT_EXCEEDED: Host clock drift (${drift}ms) exceeds the maximum allowed 10ms threshold.`
            );
        }

        const timestamp = Date.now();
        const token = crypto.createHmac('sha256', TimeAnchorEngine.TSA_KEY)
            .update(payloadHash + timestamp.toString())
            .digest('hex');

        return {
            token: `TSA_TST_${token}`,
            timestamp
        };
    }

    /**
     * Simulates appending transaction state hashes to an immutable public Rekor transparency log.
     * @param entryHash Hash of the ledger entry
     * @param signature The witness co-signature
     */
    static appendToRekor(
        entryHash: string,
        signature: string
    ): { entryIndex: number; inclusionProof: string } {
        const payload = `${entryHash}:${signature}`;
        this.rekorLog.push(payload);

        const entryIndex = this.rekorLog.length - 1;
        const inclusionProof = crypto.createHash('sha256')
            .update(payload + entryIndex.toString() + TimeAnchorEngine.REKOR_ROOT)
            .digest('hex');

        return {
            entryIndex,
            inclusionProof: `REKOR_PROOF_${inclusionProof}`
        };
    }

    static clearRekor(): void {
        this.rekorLog = [];
    }
}
