import { NetworkNamespaceController } from './network-policy.js';
import { describe, it, expect } from 'vitest';

describe('Network Namespace Controller', () => {
    it('should explicitly block IMDS cloud metadata endpoint', () => {
        const allowed = NetworkNamespaceController.validateEgressRule({
            host: '169.254.169.254',
            port: 80,
            protocol: 'tcp'
        });
        
        expect(allowed).toBe(false);
    });

    it('should allow generic egress requests by default (pending lattice wiring)', () => {
        const allowed = NetworkNamespaceController.validateEgressRule({
            host: 'api.github.com',
            port: 443,
            protocol: 'tcp'
        });
        
        expect(allowed).toBe(true);
    });
});
