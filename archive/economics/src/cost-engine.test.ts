import { describe, it, expect } from 'vitest';
import { CostEngine } from '../src/cost-engine.js';

describe('CostEngine', () => {
    it('should calculate cost per trust day correctly', () => {
        const usage = {
            cpuSeconds: 1000,
            memoryMB: 1024,
            diskMB: 300,
            networkMB: 100
        };
        const trustDays = 10;
        const metrics = CostEngine.calculateCostPerTrustDay(usage, trustDays);

        // Expected values:
        // CPU: 1000 * 0.0005 = 0.5
        // MEM: (1024/1024) * 24 * 0.0001 = 0.0024
        // DISK: 300 * 0.005 / 30 = 0.05
        // NET: 100 * 0.001 = 0.1
        // Total: 0.5 + 0.0024 + 0.05 + 0.1 = 0.6524
        // Cost/Trust-Day: 0.6524 / 10 = 0.06524

        expect(metrics.totalResourceCost).toBeCloseTo(0.6524);
        expect(metrics.costPerTrustDay).toBeCloseTo(0.06524);
        expect(metrics.currency).toBe('ZTC');
    });

    it('should project survivability correctly', () => {
        const metrics = {
            totalResourceCost: 100,
            costPerTrustDay: 1,
            efficiencyScore: 0.8,
            currency: 'ZTC'
        };
        const endowment = 365000;
        const years = CostEngine.projectSurvivability(metrics, endowment);

        // 100 * 365 = 36500 per year
        // 365000 / 36500 = 10 years
        expect(years).toBe(10);
    });

    it('should return a high score for efficient operations', () => {
        const usage = {
            cpuSeconds: 100,
            memoryMB: 128,
            diskMB: 10,
            networkMB: 5
        };
        const trustDays = 100;
        const metrics = CostEngine.calculateCostPerTrustDay(usage, trustDays);
        
        expect(metrics.efficiencyScore).toBeGreaterThan(0.9);
    });
});
