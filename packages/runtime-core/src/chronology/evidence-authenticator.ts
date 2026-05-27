import crypto from 'crypto';
import { TelemetryEvent } from './replay-compressor.js';

export interface ChainedTelemetryEvent extends TelemetryEvent {
    previousHash: string;
    hash: string;
}

export interface ProvenanceSignature {
    archiveHash: string;
    signature: string;
    signerId: string;
    timestamp: number;
}

export class EvidenceAuthenticator {
    /**
     * Chains a sequence of telemetry events cryptographically.
     * Each block binds to the previous hash creating a tamper-evident lineage.
     */
    public hashChainTelemetry(events: TelemetryEvent[], genesisHash: string = '0'.repeat(64)): ChainedTelemetryEvent[] {
        const chained: ChainedTelemetryEvent[] = [];
        let prevHash = genesisHash;

        for (const event of events) {
            // Preimage: id || timestamp || type || JSON(payload) || previousHash
            const payloadStr = JSON.stringify(event.payload || {});
            const preimage = `${event.id}${event.timestamp}${event.type}${payloadStr}${prevHash}`;
            
            const hash = crypto.createHash('sha256').update(preimage).digest('hex');

            chained.push({
                ...event,
                previousHash: prevHash,
                hash
            });

            prevHash = hash;
        }

        return chained;
    }

    /**
     * Validates a chained telemetry sequence for historical insertions, modifications, or deletions.
     */
    public validateTelemetryChain(
        chainedEvents: ChainedTelemetryEvent[],
        genesisHash: string = '0'.repeat(64)
    ): { isValid: boolean; brokenIndex: number; errorReason?: string } {
        let expectedPrevHash = genesisHash;

        for (let i = 0; i < chainedEvents.length; i++) {
            const event = chainedEvents[i];

            if (event.previousHash !== expectedPrevHash) {
                return {
                    isValid: false,
                    brokenIndex: i,
                    errorReason: `Hash continuity broken. Expected previousHash: '${expectedPrevHash}', Got: '${event.previousHash}'`
                };
            }

            const payloadStr = JSON.stringify(event.payload || {});
            const preimage = `${event.id}${event.timestamp}${event.type}${payloadStr}${event.previousHash}`;
            const recomputedHash = crypto.createHash('sha256').update(preimage).digest('hex');

            if (event.hash !== recomputedHash) {
                return {
                    isValid: false,
                    brokenIndex: i,
                    errorReason: `Signature hash mismatch. Computed: '${recomputedHash}', Stored: '${event.hash}'`
                };
            }

            expectedPrevHash = event.hash;
        }

        return {
            isValid: true,
            brokenIndex: -1
        };
    }

    /**
     * Signs a telemetry archive/snapshot hash.
     * For high durability without external key setup, we use standard RSA or HMAC signing.
     * Here we utilize ECDSA (secp256k1) or standard RSA signatures, or a secure cryptographic mock for local verification.
     */
    public signArchiveSnapshot(archiveHash: string, privateKeyPem: string): string {
        try {
            const sign = crypto.createSign('SHA256');
            sign.update(archiveHash);
            sign.end();
            return sign.sign(privateKeyPem, 'hex');
        } catch (e) {
            // Fallback to HMAC-SHA256 signature if key formats are not PEM (for drills/tests)
            return crypto.createHmac('sha256', privateKeyPem).update(archiveHash).digest('hex');
        }
    }

    /**
     * Verifies the provenance signature of a telemetry archive/snapshot.
     */
    public verifyArchiveSnapshot(archiveHash: string, signature: string, publicKeyPemOrSecret: string): boolean {
        try {
            const verify = crypto.createVerify('SHA256');
            verify.update(archiveHash);
            verify.end();
            return verify.verify(publicKeyPemOrSecret, signature, 'hex');
        } catch (e) {
            // Fallback to HMAC-SHA256 comparison
            const expectedSig = crypto.createHmac('sha256', publicKeyPemOrSecret).update(archiveHash).digest('hex');
            return expectedSig === signature;
        }
    }
}
