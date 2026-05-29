import { describe, it, expect, beforeEach } from 'vitest';
import { TpmEngine } from '../../src/trust/tpm.js';
import { ProvenanceVerifier, SupplyChainError } from '../../src/trust/provenance.js';
import { DetachedWitnessNode, QuarantineError } from '../../src/trust/witness.js';
import { TimeAnchorEngine } from '../../src/trust/time-anchor.js';
import { GovernanceLedger } from '../../src/ledger/ledger.js';

describe('Phase K1: Hardware-Rooted Trust & Witness Attestation Tests', () => {
    beforeEach(() => {
        TpmEngine.resetMockPcrs();
        GovernanceLedger.clearForTesting();
        TimeAnchorEngine.clearRekor();
    });

    it('should successfully complete witness co-signing when platform and software states are nominal', () => {
        const challenge = DetachedWitnessNode.generateChallenge();
        const quote = TpmEngine.generateQuote(challenge, [0, 7, 10]);

        const proposalHash = 'proposal-k1-hash';
        const res = DetachedWitnessNode.requestCoSign(proposalHash, quote, challenge);

        expect(res.signed).toBe(true);
        expect(res.witnessSignature).toBeDefined();
        expect(res.witnessSignature).toContain('WITNESS_SIG_');
    });

    it('should fail co-signing and throw QuarantineError (HARD QUARANTINE) when critical PCR 7 (Secure Boot) is tampered', () => {
        // Tamper Secure Boot state on the host
        TpmEngine.setMockPcr(7, 'badbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadbadb');

        const challenge = DetachedWitnessNode.generateChallenge();
        const quote = TpmEngine.generateQuote(challenge, [0, 7, 10]);

        const proposalHash = 'proposal-k2-hash';
        
        expect(() => {
            DetachedWitnessNode.requestCoSign(proposalHash, quote, challenge);
        }).toThrow(QuarantineError);

        // Re-register the spent challenge nonce so the second call also proceeds past the nonce check
        DetachedWitnessNode.registerActiveChallenge(challenge);

        expect(() => {
            DetachedWitnessNode.requestCoSign(proposalHash, quote, challenge);
        }).toThrow(/HARD QUARANTINE/);
    });

    it('should fail co-signing and transition to DEGRADED_MODE when software PCR 10 (IMA) deviates from baseline', () => {
        // Mismatch PCR 10 (IMA)
        TpmEngine.setMockPcr(10, 'sha256:unknownsoftwareimadeviation0000000000000000000000000000000');

        const challenge = DetachedWitnessNode.generateChallenge();
        const quote = TpmEngine.generateQuote(challenge, [0, 7, 10]);

        const proposalHash = 'proposal-k3-hash';
        const res = DetachedWitnessNode.requestCoSign(proposalHash, quote, challenge);

        expect(res.signed).toBe(false);
        expect(res.reason).toContain('DEGRADED_MODE');
        expect(res.reason).toContain('Software integrity deviation');
    });

    it('should reject OCI image refs that do not use digest pinning', () => {
        expect(() => {
            ProvenanceVerifier.verifyOciImage('ztan-worker:latest');
        }).toThrow(SupplyChainError);

        expect(() => {
            ProvenanceVerifier.verifyOciImage('ztan-worker:latest');
        }).toThrow(/Digest pinning required/);
    });

    it('should reject OCI images signed by unauthorized third-party identities', () => {
        const imageRef = 'ztan-worker@sha256:2222222222222222222222222222222222222222222222222222222222222222';
        expect(() => {
            ProvenanceVerifier.verifyOciImage(imageRef, 'build-bot@ztan.io');
        }).toThrow(SupplyChainError);

        expect(() => {
            ProvenanceVerifier.verifyOciImage(imageRef, 'build-bot@ztan.io');
        }).toThrow(/Signature identity mismatch/);
    });

    it('should approve OCI images signed by the expected build-bot identity', () => {
        const imageRef = 'ztan-worker@sha256:1111111111111111111111111111111111111111111111111111111111111111';
        const digest = ProvenanceVerifier.verifyOciImage(imageRef, 'build-bot@ztan.io');
        expect(digest).toBe('sha256:1111111111111111111111111111111111111111111111111111111111111111');
    });

    it('should throw QuarantineError (CLOCK_DRIFT_EXCEEDED) when local clock drift exceeds 10 milliseconds', () => {
        expect(() => {
            TimeAnchorEngine.getTsaTimestampToken('proposal-hash', 12); // 12ms drift
        }).toThrow(QuarantineError);

        expect(() => {
            TimeAnchorEngine.getTsaTimestampToken('proposal-hash', 12);
        }).toThrow(/CLOCK_DRIFT_EXCEEDED/);
    });

    it('should successfully return a signed TSA timestamp token when clock drift is within 10ms', () => {
        const res = TimeAnchorEngine.getTsaTimestampToken('proposal-hash', 5); // 5ms drift
        expect(res.token).toContain('TSA_TST_');
        expect(res.timestamp).toBeLessThanOrEqual(Date.now());
    });

    it('should successfully append signed entries to Rekor log and return inclusion proof', () => {
        const res = TimeAnchorEngine.appendToRekor('proposal-hash', 'witness-sig');
        expect(res.entryIndex).toBe(0);
        expect(res.inclusionProof).toContain('REKOR_PROOF_');
    });

    it('should block all new appends and fail-closed when the GovernanceLedger is put into quarantine', () => {
        GovernanceLedger.setQuarantined(true);
        expect(GovernanceLedger.isQuarantined()).toBe(true);

        expect(() => {
            GovernanceLedger.append('EXECUTION_STARTED', 'tenant-1', 'hash123', {});
        }).toThrow(/LEDGER_LOCKDOWN/);
    });
});
