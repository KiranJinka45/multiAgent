import { describe, it, expect, beforeEach } from 'vitest';
import { TrustRegistry } from './trust-registry';

describe('TrustRegistry', () => {
    let registry: TrustRegistry;

    beforeEach(() => {
        registry = new TrustRegistry();
    });

    it('anchors and validates epoch roots', () => {
        registry.anchorEpoch('epoch-1', '0xroot1');
        expect(registry.isValidRootForEpoch('epoch-1', '0xroot1')).toBe(true);
        expect(registry.isValidRootForEpoch('epoch-1', '0xroot2')).toBe(false);
        expect(registry.isValidRootForEpoch('epoch-2', '0xroot1')).toBe(false);
    });

    it('manages revoked signatures', () => {
        registry.revokeSignature('sig_compromised');
        expect(registry.isRevoked('sig_compromised')).toBe(true);
        expect(registry.isRevoked('sig_clean')).toBe(false);
    });

    it('checks multiple signatures for revocation', () => {
        registry.revokeSignature('sig_bad');
        expect(registry.hasRevokedSignatures(['sig_good1', 'sig_good2'])).toBe(false);
        expect(registry.hasRevokedSignatures(['sig_good1', 'sig_bad', 'sig_good2'])).toBe(true);
    });

    it('can serialize and deserialize state', () => {
        registry.anchorEpoch('epoch-a', '0xroota');
        registry.revokeSignature('sig_revoke_me');

        const serialized = registry.serialize();
        const restored = TrustRegistry.deserialize(serialized);

        expect(restored.isValidRootForEpoch('epoch-a', '0xroota')).toBe(true);
        expect(restored.isRevoked('sig_revoke_me')).toBe(true);
        expect(restored.isRevoked('sig_safe')).toBe(false);
    });
});
