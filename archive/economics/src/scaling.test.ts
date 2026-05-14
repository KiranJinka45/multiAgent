import { describe, it, expect } from 'vitest';
import { ScalingEngine } from '../src/scaling-engine.js';
import { ReplayEconomics } from '../src/replay-economics.js';

describe('ScalingEngine', () => {
    it('should predict storage growth compounding annually', () => {
        const initialSize = 1000;
        const growthRate = 0.2; // 20%
        const projections = ScalingEngine.predictStorageGrowth(initialSize, growthRate, 2);

        // Year 1: 1000 * 1.2 = 1200
        // Year 2: 1200 * 1.2 = 1440
        expect(projections[0].estimatedSizeMB).toBe(1200);
        expect(projections[1].estimatedSizeMB).toBe(1440);
        expect(projections[0].year).toBe(1);
    });

    it('should flag unsustainable growth', () => {
        const initialSize = 1000000; // 1TB
        const growthRate = 0.5;
        const projections = ScalingEngine.predictStorageGrowth(initialSize, growthRate, 1);
        
        // Cost: 1.5M MB * 0.06 = 90,000 ZTC ( > 50,000 limit)
        expect(projections[0].isSustainable).toBe(false);
    });

    it('should calculate compaction ROI', () => {
        const roi = ScalingEngine.calculateCompactionROI(10000, 10);
        expect(roi.savingsZTC).toBeGreaterThan(0);
        expect(roi.delayToExhaustionYears).toBe(5);
    });
});

describe('ReplayEconomics', () => {
    it('should calculate replay burden relative to history depth', () => {
        const burden = ReplayEconomics.calculateReplayBurden(10, 1000);
        expect(burden.totalComputeSeconds).toBeGreaterThan(0);
        expect(burden.replayToSettleRatio).toBe(4.0);
    });

    it('should recommend pruning for extreme verification ratios', () => {
        // High transactions per epoch leads to high ratio in this mock model
        const burden = ReplayEconomics.calculateReplayBurden(250, 100000);
        expect(burden.recommendation).toContain('Pruning required');
    });
});
