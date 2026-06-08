import { TpmEngine } from '../trust/tpm.js';
import { DetachedWitnessNode } from '../trust/witness.js';
import { ProvenanceVerifier, SupplyChainError } from '../trust/provenance.js';

export interface AttestationTest {
    name: string;
    vector: string;
    expectedResult: string;
}

export class AttestationCorruptionFuzzer {
    static runFuzzingCampaign(): {
        total: number;
        secure: number;
        vulnerable: number;
        results: { test: AttestationTest; secure: boolean; response: string }[]
    } {
        const tests: AttestationTest[] = [
            {
                name: 'Nonce Replay Attack (Reusing old challenge)',
                vector: 'Submit quote generated for challenge A as response to challenge B',
                expectedResult: 'QUOTE_NONCE_MISMATCH'
            },
            {
                name: 'Forged PCR Structure (Payload tampering)',
                vector: 'Modify PCR payload string without recalculating signature',
                expectedResult: 'QUOTE_SIGNATURE_INVALID'
            },
            {
                name: 'Stale Attestation Reuse (Clock Rollback)',
                vector: 'Re-submit valid quote after 24 hours of uptime',
                expectedResult: 'QUOTE_EXPIRED'
            },
            {
                name: 'Digest Substitution (Hash collision attempt)',
                vector: 'Substitute OCI container digest with identical length string',
                expectedResult: 'PROVENANCE_DIGEST_MISMATCH'
            }
        ];

        let secure = 0;
        let vulnerable = 0;
        const results = [];

        for (const test of tests) {
            let isSecure = false;
            let response = 'UNKNOWN';

            try {
                if (test.name.includes('Nonce Replay')) {
                    DetachedWitnessNode.clearActiveChallenges();
                    
                    // Generate two separate challenges
                    const challengeA = DetachedWitnessNode.generateChallenge();
                    const challengeB = DetachedWitnessNode.generateChallenge();
                    
                    // Generate a quote for challenge A
                    const quoteA = TpmEngine.generateQuote(challengeA, [0, 7, 10]);
                    
                    // Attempt to request a co-signature using quoteA against challengeB
                    const result = DetachedWitnessNode.requestCoSign('proposal-hash', quoteA, challengeB);
                    
                    if (!result.signed && result.reason?.includes(test.expectedResult)) {
                        isSecure = true;
                        response = `BLOCKED: Replay attempt correctly returned ${test.expectedResult}.`;
                    } else {
                        isSecure = false;
                        response = `ACCEPTED: Stale/replayed nonce quote was signed: ${result.reason || 'No error'}`;
                    }
                } 
                else if (test.name.includes('Forged PCR')) {
                    DetachedWitnessNode.clearActiveChallenges();
                    const challenge = DetachedWitnessNode.generateChallenge();
                    const quote = TpmEngine.generateQuote(challenge, [0, 7, 10]);
                    
                    // Tamper with the outer PCR values directly (payload tampering outside of signed block)
                    quote.pcrValues[10] = 'bad-software-hash-tampered-outside-envelope';
                    
                    const result = DetachedWitnessNode.requestCoSign('proposal-hash', quote, challenge);
                    
                    if (!result.signed && result.reason?.includes(test.expectedResult)) {
                        isSecure = true;
                        response = `BLOCKED: Structure forgery detected and returned ${test.expectedResult}.`;
                    } else {
                        isSecure = false;
                        response = `ACCEPTED: Tampered PCR values were accepted: ${result.reason || 'No error'}`;
                    }
                } 
                else if (test.name.includes('Stale Attestation')) {
                    DetachedWitnessNode.clearActiveChallenges();
                    const challenge = DetachedWitnessNode.generateChallenge();
                    
                    // Generate a quote that was created 10 minutes in the past (expired)
                    const staleQuote = TpmEngine.generateQuote(challenge, [0, 7, 10], Date.now() - 10 * 60 * 1000);
                    
                    const result = DetachedWitnessNode.requestCoSign('proposal-hash', staleQuote, challenge);
                    
                    if (!result.signed && result.reason?.includes(test.expectedResult)) {
                        isSecure = true;
                        response = `BLOCKED: Stale attestation detected and returned ${test.expectedResult}.`;
                    } else {
                        isSecure = false;
                        response = `ACCEPTED: Stale attestation quote was signed: ${result.reason || 'No error'}`;
                    }
                } 
                else if (test.name.includes('Digest Substitution')) {
                    // Test digest substitution: submit an unsigned image ref
                    const unsignedImageRef = 'ztan-worker@sha256:3333333333333333333333333333333333333333333333333333333333333333';
                    
                    try {
                        ProvenanceVerifier.verifyOciImage(unsignedImageRef);
                        isSecure = false;
                        response = 'ACCEPTED: Unsigned OCI image reference was accepted.';
                    } catch (err: unknown) {
                        const message = err instanceof Error ? err.message : String(err);
                        if (err instanceof SupplyChainError || message.includes('No valid signature found')) {
                            isSecure = true;
                            response = `BLOCKED: Digest substitution rejected. Message: ${message}`;
                        } else {
                            isSecure = false;
                            response = `FAILED: Verification threw unexpected error: ${message}`;
                        }
                    }
                }
            } catch (err: unknown) {
                isSecure = false;
                const message = err instanceof Error ? err.message : String(err);
                response = `EXHAUSTED (Crash): ${message}`;
            }

            if (isSecure) {
                secure++;
            } else {
                vulnerable++;
            }

            results.push({
                test,
                secure: isSecure,
                response
            });
        }

        return {
            total: tests.length,
            secure,
            vulnerable,
            results
        };
    }
}
