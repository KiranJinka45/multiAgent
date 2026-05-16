import { describe, it, expect } from 'vitest';
import { ConsensusEngine } from '../src/consensus-engine';

describe('ZTAN Phase 17: Stability Freeze & Security Transparency', () => {
    const BASE_T = 2;
    const NODE_IDS = ['node-1', 'node-2', 'node-3', 'node-4', 'node-5'];

    it('Stability: Protocol Core Locking', async () => {
        const engine = new ConsensusEngine(BASE_T, 5, NODE_IDS);
        expect((engine as any).isLocked).toBe(false);

        // 1. Lock Protocol
        engine.lockProtocol();
        expect((engine as any).isLocked).toBe(true);
    });

    it('Transparency: Security Manifest Generation', async () => {
        const engine = new ConsensusEngine(BASE_T, 5, NODE_IDS);
        const specHash = 'spec-v1.0-frozen';
        const vectorHash = 'vectors-v1.0-frozen';

        // 1. Generate History
        engine.enforceSlashing('node-5', { eventId: 'ev1' });
        
        // 2. Lock and Generate Manifest
        engine.lockProtocol();
        const manifest = engine.generateSecurityManifest(specHash, vectorHash);

        expect(manifest.isLocked).toBe(true);
        expect(manifest.hashes.specification).toBe(specHash);
        expect(manifest.hashes.archiveRoot).toBe((engine as any).archiveRoot);
        expect(manifest.invariants).toContain('Non-repudiable governance receipts');
        expect(manifest.operationalSLOs.convergenceGoalMs).toBe(5000);
    });

    it('Audit: Manifest Integrity Binding', async () => {
        const engine = new ConsensusEngine(BASE_T, 5, NODE_IDS);
        const manifest = engine.generateSecurityManifest('s1', 'v1');

        // Verify that the manifest binds the release version
        expect(manifest.releaseVersion).toBe('v1.0.0-audit');
    });
});
