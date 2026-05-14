export interface ReplayBurden {
    totalComputeSeconds: number;
    totalNetworkMB: number;
    replayToSettleRatio: number; // Cost of verification / Cost of initial execution
    recommendation: string;
}

export class ReplayEconomics {
    private static COMPUTE_COST_PER_SEC = 0.0005;
    private static NETWORK_COST_PER_MB = 0.001;

    /**
     * Calculate the resource burden of a full forensic history replay.
     */
    static calculateReplayBurden(historyDepthEpochs: number, avgTransactionsPerEpoch: number): ReplayBurden {
        const totalOps = historyDepthEpochs * avgTransactionsPerEpoch;
        
        // Replay is usually 3x more expensive than execution due to verification/hashing overhead
        const computeSeconds = totalOps * 0.01 * 3; 
        const networkMB = (totalOps * 0.005); 
        // Add non-linear indexing overhead for deep history
        const indexingOverhead = historyDepthEpochs > 50 ? (historyDepthEpochs / 50) : 1;
        const replayCost = ((computeSeconds * this.COMPUTE_COST_PER_SEC) + (networkMB * this.NETWORK_COST_PER_MB)) * indexingOverhead;
        const executionCost = (computeSeconds / 3) * this.COMPUTE_COST_PER_SEC; // Simulated original cost

        const ratio = executionCost > 0 ? replayCost / executionCost : 3.0;

        let recommendation = 'Sustainable forensic depth.';
        if (ratio > 5) recommendation = 'High verification overhead. Enable Evidence Compaction.';
        if (ratio > 10) recommendation = 'Verification cost exceeds execution utility. Pruning required.';

        return {
            totalComputeSeconds: Math.round(computeSeconds),
            totalNetworkMB: Math.round(networkMB),
            replayToSettleRatio: parseFloat(ratio.toFixed(2)),
            recommendation
        };
    }
}
