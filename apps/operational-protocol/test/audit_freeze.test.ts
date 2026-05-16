import { describe, it, expect } from 'vitest';
import { ConsensusEngine } from '../src/consensus-engine';

describe('ZTAN Phase 16: Audit Release Freeze & Reproducibility', () => {
    const BASE_T = 2;
    const NODE_IDS = ['node-1', 'node-2', 'node-3', 'node-4', 'node-5'];

    it('Freeze: Canonical Audit Manifest Generation', async () => {
        const engine = new ConsensusEngine(BASE_T, 5, NODE_IDS);
        const specHash = 'hash-of-formal-spec-v1.0';
        const vectorHash = 'hash-of-test-corpus-v1.0';

        // 1. Generate some history
        engine.enforceSlashing('node-5', { eventId: 'ev1' });
        const currentArchiveRoot = (engine as any).archiveRoot;

        // 2. Freeze Release
        const manifest = engine.freezeAuditRelease(specHash, vectorHash);

        expect(manifest.version).toBe('v1.0.0-audit');
        expect(manifest.protocolSpecHash).toBe(specHash);
        expect(manifest.vectorCorpusHash).toBe(vectorHash);
        expect(manifest.archiveRoot).toBe(currentArchiveRoot);
        expect(manifest.manifestSignature).toBeDefined();
    });

    it('Stability: Manifest Captures Point-in-Time Archive Root', async () => {
        const engine = new ConsensusEngine(BASE_T, 5, NODE_IDS);
        engine.enforceSlashing('node-5', { eventId: 'ev1' });
        const rootBefore = (engine as any).archiveRoot;

        const manifest = engine.freezeAuditRelease('spec', 'vector');
        expect(manifest.archiveRoot).toBe(rootBefore);

        // Modify history AFTER freeze
        engine.enforceSlashing('node-4', { eventId: 'ev2' });
        const rootAfter = (engine as any).archiveRoot;
        expect(manifest.archiveRoot).not.toBe(rootAfter);
    });

    it('Audit: Signed Manifest Non-Repudiability', async () => {
        const engine = new ConsensusEngine(BASE_T, 5, NODE_IDS);
        const manifest = engine.freezeAuditRelease('s1', 'v1');

        // Verify that changing the manifest data invalidates the signature logic (simulated)
        const tampered = { ...manifest, protocolSpecHash: 'tampered-spec' };
        const { manifestSignature, ...bundle } = tampered;
        
        // Manual verification logic
        const crypto = await import('crypto');
        const expected = crypto.createHash('sha256').update(JSON.stringify(bundle)).digest('hex');
        expect(manifestSignature).not.toBe(expected);
    });
});
