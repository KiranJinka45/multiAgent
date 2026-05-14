export interface TCOBreakdown {
    infrastructureCost: number;
    archivalCost: number;
    governanceOverhead: number;
    totalTCO: number;
    costPerUserYear: number;
}

export class TCOEngine {
    /**
     * Calculate Total Cost of Ownership including social/governance overhead.
     * @param annualDirectCost Sum of infra and storage costs
     * @param userCount Number of active institutional participants
     * @param governanceOverheadFactor Multiplier for human-in-the-loop governance (default 0.15)
     */
    static calculateTCO(annualDirectCost: number, userCount: number, governanceOverheadFactor: number = 0.15): TCOBreakdown {
        const infrastructureCost = annualDirectCost * 0.7; // 70% direct resource
        const archivalCost = annualDirectCost * 0.3;     // 30% storage/scaling
        const governanceOverhead = annualDirectCost * governanceOverheadFactor;
        
        const totalTCO = infrastructureCost + archivalCost + governanceOverhead;
        const costPerUserYear = userCount > 0 ? totalTCO / userCount : totalTCO;

        return {
            infrastructureCost: parseFloat(infrastructureCost.toFixed(2)),
            archivalCost: parseFloat(archivalCost.toFixed(2)),
            governanceOverhead: parseFloat(governanceOverhead.toFixed(2)),
            totalTCO: parseFloat(totalTCO.toFixed(2)),
            costPerUserYear: parseFloat(costPerUserYear.toFixed(2))
        };
    }
}
