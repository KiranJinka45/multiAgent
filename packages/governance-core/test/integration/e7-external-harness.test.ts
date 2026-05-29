import { describe, it, expect } from 'vitest';
import { EnvironmentDiscovery } from '../../src/isolation/discovery.js';

describe('Phase E7: Portability & External Environment Discovery Harness', () => {
    it('should query platform environment properties and return a well-formed capability profile', () => {
        const profile = EnvironmentDiscovery.discover();
        expect(profile).toHaveProperty('platform');
        expect(profile).toHaveProperty('arch');
        expect(profile).toHaveProperty('hasKvm');
        expect(profile).toHaveProperty('hasCgroups');
        expect(profile).toHaveProperty('hasFirecracker');
        expect(profile).toHaveProperty('virtualizationSupported');

        expect(typeof profile.hasKvm).toBe('boolean');
        expect(typeof profile.hasCgroups).toBe('boolean');
        expect(typeof profile.hasFirecracker).toBe('boolean');
        expect(typeof profile.virtualizationSupported).toBe('boolean');
    });

    it('should verify environment constraints behave correctly on Windows', () => {
        const profile = EnvironmentDiscovery.discover();
        if (process.platform === 'win32') {
            expect(profile.hasKvm).toBe(false);
            expect(profile.hasCgroups).toBe(false);
        }
    });
});
