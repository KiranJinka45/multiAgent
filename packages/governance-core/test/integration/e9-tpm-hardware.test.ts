import { describe, it, expect, vi, beforeEach } from 'vitest';
import { TpmEngine } from '../../src/trust/tpm.js';
import { PhysicalTpmConnector } from '../../src/trust/physical-tpm-spec.js';

describe('Phase E9: TPM 2.0 Hardware Attestation', () => {
    beforeEach(() => {
        vi.restoreAllMocks();
        TpmEngine.resetMockPcrs();
    });

    it('should generate and verify mock software attestation when hardware TPM is unavailable', () => {
        vi.spyOn(PhysicalTpmConnector, 'isHardwareTpmAvailable').mockReturnValue(false);

        const nonce = 'challenge-nonce-1234';
        const pcrs = [0, 7, 10];
        
        const quote = TpmEngine.generateQuote(nonce, pcrs);
        expect(quote.nonce).toBe(nonce);
        expect(quote.pcrValues[0]).toBe(TpmEngine.BASELINE_PCR_0);
        expect(quote.pcrValues[7]).toBe(TpmEngine.BASELINE_PCR_7);

        const result = TpmEngine.verifyQuote(quote, nonce, {
            0: TpmEngine.BASELINE_PCR_0,
            7: TpmEngine.BASELINE_PCR_7,
            10: TpmEngine.BASELINE_PCR_10
        });

        expect(result.verified).toBe(true);
    });

    it('should leverage PhysicalTpmConnector when hardware TPM is available', () => {
        vi.spyOn(PhysicalTpmConnector, 'isHardwareTpmAvailable').mockReturnValue(true);

        const nonce = 'challenge-nonce-5678';
        const pcrs = [0, 1, 7];

        const quote = TpmEngine.generateQuote(nonce, pcrs);
        expect(quote.nonce).toBe(nonce);
        
        // Assert it is structured as a physical hardware quote
        const parsed = JSON.parse(quote.attestedData);
        expect(parsed.type).toBe('TPM2B_ATTEST_HARDWARE');
        expect(parsed.quoteBytes).toBeDefined();

        // Verify quote successfully
        const result = TpmEngine.verifyQuote(quote, nonce, {
            0: '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
            7: 'fdeca12938475610fdeca12938475610fdeca12938475610fdeca12938475610'
        });

        expect(result.verified).toBe(true);
    });

    it('should reject quotes with nonce mismatch', () => {
        vi.spyOn(PhysicalTpmConnector, 'isHardwareTpmAvailable').mockReturnValue(true);

        const nonce = 'expected-nonce';
        const quote = TpmEngine.generateQuote(nonce, [0, 7]);

        const result = TpmEngine.verifyQuote(quote, 'malicious-nonce', {
            0: '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b'
        });

        expect(result.verified).toBe(false);
        expect(result.errorType).toBe('NONCE_MISMATCH');
    });

    it('should trigger HARD_QUARANTINE when critical physical boot PCRs are tampered with', () => {
        vi.spyOn(PhysicalTpmConnector, 'isHardwareTpmAvailable').mockReturnValue(true);

        const nonce = 'pcr-tamper-nonce';
        const quote = TpmEngine.generateQuote(nonce, [0, 7]);

        // Expect PCR 7 (Secure Boot) to be verified, but simulate a mismatched host hash
        const result = TpmEngine.verifyQuote(quote, nonce, {
            0: '1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b',
            7: 'ATTACKER_MUTATED_PCR_7_SECURE_BOOT_STATE'
        });

        expect(result.verified).toBe(false);
        expect(result.errorType).toBe('HARD_QUARANTINE');
        expect(result.details).toContain('Critical hardware substrate deviation detected on physical PCR 7');
    });

    it('should trigger DEGRADED_MODE when non-critical software IMA list PCR 10 is modified', () => {
        vi.spyOn(PhysicalTpmConnector, 'isHardwareTpmAvailable').mockReturnValue(false);

        const nonce = 'ima-tamper-nonce';
        
        // Mutate software measurement PCR 10
        TpmEngine.setMockPcr(10, 'MUTATED_SOFTWARE_HASH_IMA_LIST_10');
        const quote = TpmEngine.generateQuote(nonce, [0, 10]);

        const result = TpmEngine.verifyQuote(quote, nonce, {
            0: TpmEngine.BASELINE_PCR_0,
            10: TpmEngine.BASELINE_PCR_10 // We expect the original baseline
        });

        expect(result.verified).toBe(false);
        expect(result.errorType).toBe('DEGRADED_MODE');
        expect(result.details).toContain('Software integrity deviation detected on PCR 10 (IMA)');
    });
});
