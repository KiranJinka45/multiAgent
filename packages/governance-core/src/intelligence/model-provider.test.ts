import { StubbedModelProvider } from './model-provider.js';
import { describe, it, expect } from 'vitest';

describe('Model Provider', () => {
    it('should strictly emit execution proposals', async () => {
        const provider = new StubbedModelProvider();
        const proposals = await provider.generateProposals('Do something', 'tenant-1');
        
        expect(proposals.length).toBeGreaterThan(0);
        expect(proposals[0]).toHaveProperty('toolName');
        expect(proposals[0]).toHaveProperty('tenantId', 'tenant-1');
        expect(proposals[0]).toHaveProperty('payload');
    });
});
