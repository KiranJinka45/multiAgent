export interface ScalingProjection {
    year: number;
    estimatedSizeMB: number;
    annualCostZTC: number;
    isSustainable: boolean;
}

export class ScalingEngine {
    private static STORAGE_COST_PER_MB_YEAR = 0.06; // 0.005/mo * 12
    private static MAX_SUSTAINABLE_ANNUAL_COST = 50000; // Limit for a standard federation

    /**
     * Predict storage growth over a multi-year horizon.
     * @param initialSizeMB Current storage footprint
     * @param growthRate Annual data growth rate (e.g., 0.2 for 20%)
     * @param horizonYears Number of years to project
     */
    static predictStorageGrowth(initialSizeMB: number, growthRate: number, horizonYears: number): ScalingProjection[] {
        const projections: ScalingProjection[] = [];
        let currentSize = initialSizeMB;

        for (let year = 1; year <= horizonYears; year++) {
            currentSize = currentSize * (1 + growthRate);
            const annualCost = currentSize * this.STORAGE_COST_PER_MB_YEAR;
            
            projections.push({
                year,
                estimatedSizeMB: Math.round(currentSize),
                annualCostZTC: parseFloat(annualCost.toFixed(2)),
                isSustainable: annualCost <= this.MAX_SUSTAINABLE_ANNUAL_COST
            });
        }

        return projections;
    }

    /**
     * Calculate the economic benefit of compaction.
     */
    static calculateCompactionROI(currentSizeMB: number, compactionRatio: number): { savingsZTC: number, delayToExhaustionYears: number } {
        const savedSize = currentSizeMB * (1 - (1 / compactionRatio));
        const savingsZTC = savedSize * this.STORAGE_COST_PER_MB_YEAR;
        
        // Simulating that compaction buys roughly 3-5 years of headroom
        return {
            savingsZTC: parseFloat(savingsZTC.toFixed(2)),
            delayToExhaustionYears: Math.round(compactionRatio / 2) 
        };
    }
}
