import { describe, it, expect } from 'vitest';
import { TCOEngine } from '../src/tco-engine.js';
import { SustainabilityCertifier } from '../src/sustainability-certifier.js';

describe('TCOEngine', () => {
    it('should aggregate costs and calculate per-user metrics', () => {
        const annualDirectCost = 100000;
        const users = 1000;
        const tco = TCOEngine.calculateTCO(annualDirectCost, users);

        // 70% Infra = 70,000
        // 30% Archive = 30,000
        // 15% Gov = 15,000
        // Total = 115,000
        expect(tco.totalTCO).toBe(115000);
        expect(tco.costPerUserYear).toBe(115);
    });

    it('should handle zero users gracefully', () => {
        const tco = TCOEngine.calculateTCO(100, 0);
        expect(tco.costPerUserYear).toBe(tco.totalTCO);
    });
});

describe('SustainabilityCertifier', () => {
    it('should issue a valid certificate with metrics', () => {
        const metrics = {
            costPerTrustDay: 0.05,
            efficiencyScore: 0.9,
            survivabilityYears: 50
        };
        const cert = SustainabilityCertifier.issueCertificate('FED-01', metrics);

        expect(cert.subject).toBe('FED-01');
        expect(cert.metrics.efficiencyScore).toBe(0.9);
        expect(cert.status).toBe('VALID');
        expect(cert.signature).toBeDefined();
    });

    it('should verify certificate validity based on expiry', () => {
        const cert = SustainabilityCertifier.issueCertificate('FED-01', {});
        expect(SustainabilityCertifier.verifyCertificate(cert)).toBe(true);

        // Mock expiry in the past
        cert.expiresAt = new Date(Date.now() - 10000).toISOString();
        expect(SustainabilityCertifier.verifyCertificate(cert)).toBe(false);
    });
});
