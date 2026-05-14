
export interface ResourceUsage {
    cpuSeconds: number;
    memoryMB: number;
    diskMB: number;
    networkMB: number;
}

export interface EconomicMetric {
    costPerTrustDay: number;
    efficiencyScore: number;
    totalResourceCost: number;
    currency: string;
}

/**
 * Economic unit costs for the ZTAN Civilizational Operating Substrate.
 * These represent the simulated cost of decentralized physical infrastructure.
 */
const UNIT_COSTS = {
    CPU_SECOND: 0.0005,  // Cost per CPU second of institutional compute
    MEMORY_MB_HOUR: 0.0001, // Cost per MB-hour of institutional memory
    DISK_MB_MONTH: 0.005,   // Cost per MB-month of archival storage
    NETWORK_MB: 0.001       // Cost per MB of cross-federation data transfer
};

export class CostEngine {
    /**
     * Calculate the direct resource cost of institutional finality over a given duration.
     * @param usage Aggregated resource usage data
     * @param trustDays Number of trust days accumulated in this period
     */
    static calculateCostPerTrustDay(usage: ResourceUsage, trustDays: number): EconomicMetric {
        const cpuCost = usage.cpuSeconds * UNIT_COSTS.CPU_SECOND;
        const memoryCost = (usage.memoryMB / 1024) * 24 * UNIT_COSTS.MEMORY_MB_HOUR; // Simplified to 24h period
        const diskCost = usage.diskMB * UNIT_COSTS.DISK_MB_MONTH / 30; // Cost per day
        const networkCost = usage.networkMB * UNIT_COSTS.NETWORK_MB;

        const totalResourceCost = cpuCost + memoryCost + diskCost + networkCost;
        const costPerTrustDay = trustDays > 0 ? totalResourceCost / trustDays : totalResourceCost;

        // Efficiency score: Lower cost relative to "Ideal" (0.05 per Trust Day) results in higher score
        const idealCost = 0.05;
        const efficiencyScore = Math.max(0, Math.min(1, idealCost / Math.max(idealCost, costPerTrustDay)));

        console.log(`💰 Economic Metric Calculated: ${costPerTrustDay.toFixed(4)} Cost/Trust-Day (Efficiency: ${(efficiencyScore * 100).toFixed(0)}%)`);

        return {
            costPerTrustDay,
            efficiencyScore,
            totalResourceCost,
            currency: 'ZTC' // ZTAN Trust Credits
        };
    }

    /**
     * Project long-term economic survivability based on current cost trends.
     */
    static projectSurvivability(currentMetrics: EconomicMetric, institutionalEndowment: number): number {
        const burnRatePerDay = currentMetrics.totalResourceCost;
        if (burnRatePerDay <= 0) return 999; // Eternal survivability
        
        return institutionalEndowment / (burnRatePerDay * 365);
    }
}
