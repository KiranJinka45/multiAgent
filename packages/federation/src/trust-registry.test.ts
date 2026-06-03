import { describe, it, expect, beforeEach } from 'vitest';
import { TrustRegistry, EpochAnchor } from './trust-registry';

describe('TrustRegistry', () => {
    let registry: TrustRegistry;

    beforeEach(() => {
        registry = new TrustRegistry();
    });

    it('anchors and validates epoch roots', () => {
        registry.anchorEpoch('epoch-1', '0xroot1', ['pk1', 'pk2']);
        expect(registry.isValidRootForEpoch('epoch-1', '0xroot1')).toBe(true);
        expect(registry.isValidRootForEpoch('epoch-1', '0xroot2')).toBe(false);
        expect(registry.isValidRootForEpoch('epoch-2', '0xroot1')).toBe(false);
        expect(registry.getOperatorKeysForEpoch('epoch-1')).toEqual(['pk1', 'pk2']);
    });

    it('manages revoked public keys', () => {
        registry.revokePublicKey('pk_compromised');
        expect(registry.isRevoked('pk_compromised')).toBe(true);
        expect(registry.isRevoked('pk_clean')).toBe(false);
    });

    it('checks multiple public keys for revocation', () => {
        registry.revokePublicKey('pk_bad');
        expect(registry.hasRevokedKeys(['pk_good1', 'pk_good2'])).toBe(false);
        expect(registry.hasRevokedKeys(['pk_good1', 'pk_bad', 'pk_good2'])).toBe(true);
    });

    it('can serialize and deserialize state', () => {
        registry.anchorEpoch('epoch-a', '0xroota', ['pk_a']);
        registry.revokePublicKey('pk_revoke_me');

        const serialized = registry.serialize();
        const restored = TrustRegistry.deserialize(serialized);

        expect(restored.isValidRootForEpoch('epoch-a', '0xroota')).toBe(true);
        expect(restored.getOperatorKeysForEpoch('epoch-a')).toEqual(['pk_a']);
        expect(restored.isRevoked('pk_revoke_me')).toBe(true);
        expect(restored.isRevoked('pk_safe')).toBe(false);
    });
});
