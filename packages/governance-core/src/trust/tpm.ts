import * as crypto from 'crypto';
import { PhysicalTpmConnector } from './physical-tpm-spec.js';

export interface TpmQuote {
    signature: string;
    pcrValues: Record<number, string>;
    nonce: string;
    attestedData: string;
    timestamp: number;
}

export class TpmEngine {
    // Standard whitelisted PCR baseline state hashes
    public static readonly BASELINE_PCR_0 = 'ef234a9b7c8d9e0f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f'; // BIOS/UEFI
    public static readonly BASELINE_PCR_7 = 'aa83b7f1e9c2d3b4a5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f6a7b8'; // Secure Boot policy
    public static readonly BASELINE_PCR_10 = '1010101010101010101010101010101010101010101010101010101010101010'; // IMA (software measurement list)

    private static readonly AK_KEY = process.env.ZTAN_AK_KEY || crypto.randomBytes(32).toString('hex');

    private static currentPcrs: Record<number, string> = {
        0: TpmEngine.BASELINE_PCR_0,
        1: '0000000000000000000000000000000000000000000000000000000000000000',
        2: '0000000000000000000000000000000000000000000000000000000000000000',
        3: '0000000000000000000000000000000000000000000000000000000000000000',
        4: 'b4a8e29cf10d3a958e7b6d1f0c2a4e9b7d8c0e1f2a3b4c5d6e7f8a9b0c1d2e3f', // MBR
        5: '0000000000000000000000000000000000000000000000000000000000000000',
        7: TpmEngine.BASELINE_PCR_7,
        10: TpmEngine.BASELINE_PCR_10
    };

    static setMockPcr(index: number, hash: string): void {
        this.currentPcrs[index] = hash;
    }

    static getMockPcr(index: number): string {
        return this.currentPcrs[index] || '0000000000000000000000000000000000000000000000000000000000000000';
    }

    static resetMockPcrs(): void {
        this.currentPcrs = {
            0: TpmEngine.BASELINE_PCR_0,
            1: '0000000000000000000000000000000000000000000000000000000000000000',
            2: '0000000000000000000000000000000000000000000000000000000000000000',
            3: '0000000000000000000000000000000000000000000000000000000000000000',
            4: 'b4a8e29cf10d3a958e7b6d1f0c2a4e9b7d8c0e1f2a3b4c5d6e7f8a9b0c1d2e3f',
            5: '0000000000000000000000000000000000000000000000000000000000000000',
            7: TpmEngine.BASELINE_PCR_7,
            10: TpmEngine.BASELINE_PCR_10
        };
    }

    static generateQuote(nonce: string, pcrsToQuote: number[], customTimestamp?: number): TpmQuote {
        if (PhysicalTpmConnector.isHardwareTpmAvailable()) {
            console.log('[TPM_ENGINE] Leveraging hardware-rooted physical TPM 2.0...');
            const quotePayload = PhysicalTpmConnector.generatePhysicalQuote(nonce, { algorithm: 'sha256', pcrs: pcrsToQuote });
            const timestamp = customTimestamp !== undefined ? customTimestamp : Date.now();
            const attestedDataObj = {
                nonce,
                pcrValues: quotePayload.pcrs,
                type: 'TPM2B_ATTEST_HARDWARE',
                timestamp,
                quoteBytes: quotePayload.quoteBytes
            };
            const attestedData = JSON.stringify(attestedDataObj);
            
            return {
                signature: quotePayload.signatureBytes,
                pcrValues: quotePayload.pcrs,
                nonce,
                attestedData,
                timestamp
            };
        }

        const quotedPcrs: Record<number, string> = {};
        for (const idx of pcrsToQuote) {
            quotedPcrs[idx] = this.getMockPcr(idx);
        }

        const timestamp = customTimestamp !== undefined ? customTimestamp : Date.now();

        const attestedDataObj = {
            nonce,
            pcrValues: quotedPcrs,
            type: 'TPM2B_ATTEST',
            timestamp
        };

        const attestedData = JSON.stringify(attestedDataObj);

        // Sign using simulated Attestation Key (AK)
        const signature = crypto.createHmac('sha256', TpmEngine.AK_KEY)
            .update(attestedData)
            .digest('hex');

        return {
            signature,
            pcrValues: quotedPcrs,
            nonce,
            attestedData,
            timestamp
        };
    }

    static verifyQuote(
        quote: TpmQuote,
        nonce: string,
        expectedPcrs: Record<number, string>
    ): { verified: boolean; errorType?: 'NONCE_MISMATCH' | 'SIGNATURE_INVALID' | 'HARD_QUARANTINE' | 'DEGRADED_MODE' | 'QUOTE_EXPIRED'; details?: string } {
        // 0. Check if this is a physical hardware quote
        let isHardware = false;
        try {
            const parsed = JSON.parse(quote.attestedData);
            if (parsed.type === 'TPM2B_ATTEST_HARDWARE') {
                isHardware = true;
            }
        } catch {}

        if (isHardware) {
            console.log('[TPM_ENGINE] Verifying physical hardware-rooted TPM 2.0 quote...');
            
            // Check nonce
            if (quote.nonce !== nonce) {
                return {
                    verified: false,
                    errorType: 'NONCE_MISMATCH',
                    details: `Quote nonce (${quote.nonce}) does not match challenge nonce (${nonce})`
                };
            }

            // Cryptographically verify hardware signature using tpm2_checkquote
            try {
                const parsed = JSON.parse(quote.attestedData);
                const sigValid = PhysicalTpmConnector.verifyPhysicalQuote(nonce, parsed.quoteBytes, quote.signature);
                if (!sigValid) {
                    return {
                        verified: false,
                        errorType: 'SIGNATURE_INVALID',
                        details: 'Hardware tpm2_checkquote verification failed. Signature or quote payload is invalid.'
                    };
                }
            } catch (e: unknown) {
                const message = e instanceof Error ? e.message : String(e);
                return {
                    verified: false,
                    errorType: 'SIGNATURE_INVALID',
                    details: `Hardware verification error: ${message}`
                };
            }

            // Verify PCR measurements matching expected physical baseline
            for (const [idxStr, expectedVal] of Object.entries(expectedPcrs)) {
                const idx = parseInt(idxStr, 10);
                const actualVal = quote.pcrValues[idx];

                if (actualVal !== expectedVal) {
                    if ([0, 1, 2, 3, 4, 5, 7].includes(idx)) {
                        return {
                            verified: false,
                            errorType: 'HARD_QUARANTINE',
                            details: `Critical hardware substrate deviation detected on physical PCR ${idx}: expected "${expectedVal}", found "${actualVal}"`
                        };
                    }
                    if (idx === 10) {
                        return {
                            verified: false,
                            errorType: 'DEGRADED_MODE',
                            details: `Software integrity deviation detected on physical PCR 10 (IMA): expected "${expectedVal}", found "${actualVal}"`
                        };
                    }
                }
            }

            return { verified: true };
        }

        // 1. Verify signature first
        const expectedSig = crypto.createHmac('sha256', TpmEngine.AK_KEY)
            .update(quote.attestedData)
            .digest('hex');

        if (quote.signature !== expectedSig) {
            return {
                verified: false,
                errorType: 'SIGNATURE_INVALID',
                details: 'TPM quote signature is invalid'
            };
        }

        // 2. Parse attestedData and verify deep integrity (prevent PCR and nonce tampering)
        try {
            const parsed = JSON.parse(quote.attestedData);
            if (parsed.nonce !== quote.nonce) {
                return {
                    verified: false,
                    errorType: 'SIGNATURE_INVALID',
                    details: `Tampering detected: attested nonce "${parsed.nonce}" does not match outer nonce "${quote.nonce}"`
                };
            }
            
            // Check that every outer PCR value matches the signed inner PCR value
            for (const [idxStr, outerVal] of Object.entries(quote.pcrValues)) {
                const idx = parseInt(idxStr, 10);
                const innerVal = parsed.pcrValues[idx];
                if (innerVal !== outerVal) {
                    return {
                        verified: false,
                        errorType: 'SIGNATURE_INVALID',
                        details: `Tampering detected: attested PCR ${idx} value "${innerVal}" does not match outer PCR value "${outerVal}"`
                    };
                }
            }

            // 3. Verify nonce matches challenge nonce
            if (quote.nonce !== nonce) {
                return {
                    verified: false,
                    errorType: 'NONCE_MISMATCH',
                    details: `Quote nonce (${quote.nonce}) does not match challenge nonce (${nonce})`
                };
            }

            // 4. Verify timestamp expiration (Older than 5 minutes or in future)
            const quoteTime = parsed.timestamp || quote.timestamp || 0;
            const ageMs = Date.now() - quoteTime;
            if (ageMs > 5 * 60 * 1000 || ageMs < -5000) {
                return {
                    verified: false,
                    errorType: 'QUOTE_EXPIRED',
                    details: `Quote expired. Age: ${(ageMs / 1000).toFixed(1)}s`
                };
            }

        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            return {
                verified: false,
                errorType: 'SIGNATURE_INVALID',
                details: `Attested data parsing error: ${message}`
            };
        }

        // 5. Verify PCR measurements
        for (const [idxStr, expectedVal] of Object.entries(expectedPcrs)) {
            const idx = parseInt(idxStr, 10);
            const actualVal = quote.pcrValues[idx];

            if (actualVal !== expectedVal) {
                // If boot config or Secure Boot keys are modified -> HARD QUARANTINE
                if ([0, 1, 2, 3, 4, 5, 7].includes(idx)) {
                    return {
                        verified: false,
                        errorType: 'HARD_QUARANTINE',
                        details: `Critical hardware substrate deviation detected on PCR ${idx}: expected "${expectedVal}", found "${actualVal}"`
                    };
                }
                // If software payload (IMA list) is modified -> DEGRADED MODE (suspend database writes)
                if (idx === 10) {
                    return {
                        verified: false,
                        errorType: 'DEGRADED_MODE',
                        details: `Software integrity deviation detected on PCR 10 (IMA): expected "${expectedVal}", found "${actualVal}"`
                    };
                }
            }
        }

        return { verified: true };
    }
}
