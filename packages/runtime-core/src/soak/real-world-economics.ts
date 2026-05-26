export interface StorageCostProjection {
    uncompressedGb: number;
    standardGb: number;
    glacierGb: number;
    monthlyStandardCostUsd: number;
    monthlyGlacierCostUsd: number;
    totalMonthlyStorageCostUsd: number;
}

export interface RetrievalCostReport {
    bytesRestored: number;
    retrievalCostUsd: number;
    latencyMinutes: number;
}

export interface FatigueLaborReport {
    alertsTriageTimeHours: number;
    productivityLossUsd: number;
    effectiveHourlyRate: number;
    mttrMultiplier: number;
}

export class RealWorldEconomicsDatabase {
    // AWS pricing constants as of 2026
    private readonly s3StandardPricePerGbMonth = 0.023;
    private readonly s3GlacierDeepPricePerGbMonth = 0.00099;
    private readonly awsLambdaPricePerGbSecond = 0.0000166667;
    private readonly dataTransferOutEgressPricePerGb = 0.09; // AWS internet egress

    private baseSreHourlyRate: number;

    constructor(baseSreHourlyRate: number = 75.00) {
        this.baseSreHourlyRate = baseSreHourlyRate;
    }

    /**
     * Calculates monthly storage projection across Standard and Glacier Deep Archive tiers.
     */
    public calculateStorageModel(uncompressedBytes: number, glacierRatio: number = 0.8): StorageCostProjection {
        const uncompressedGb = uncompressedBytes / (1024 * 1024 * 1024);
        const glacierRatioClamped = Math.max(0.0, Math.min(1.0, glacierRatio));
        
        const glacierGb = uncompressedGb * glacierRatioClamped;
        const standardGb = uncompressedGb * (1.0 - glacierRatioClamped);

        const monthlyStandardCostUsd = standardGb * this.s3StandardPricePerGbMonth;
        const monthlyGlacierCostUsd = glacierGb * this.s3GlacierDeepPricePerGbMonth;

        return {
            uncompressedGb: Math.round(uncompressedGb * 100) / 100,
            standardGb: Math.round(standardGb * 100) / 100,
            glacierGb: Math.round(glacierGb * 100) / 100,
            monthlyStandardCostUsd: Math.round(monthlyStandardCostUsd * 100) / 100,
            monthlyGlacierCostUsd: Math.round(monthlyGlacierCostUsd * 100) / 100,
            totalMonthlyStorageCostUsd: Math.round((monthlyStandardCostUsd + monthlyGlacierCostUsd) * 100) / 100
        };
    }

    /**
     * Computes the serverless compute budget required to run replay validators.
     */
    public calculateComputeReplayBudget(
        replayExecutions: number,
        avgCpuSecondsPerExecution: number,
        ramAllocationMb: number = 1024
    ): { lambdaExecCostUsd: number; totalComputeCostUsd: number } {
        const ramGb = ramAllocationMb / 1024;
        const totalDurationGbSeconds = replayExecutions * avgCpuSecondsPerExecution * ramGb;
        
        // AWS Lambda duration charges
        const lambdaExecCostUsd = totalDurationGbSeconds * this.awsLambdaPricePerGbSecond;
        // Lambda requests cost: $0.20 per million requests
        const lambdaRequestCostUsd = (replayExecutions / 1000000) * 0.20;

        const total = lambdaExecCostUsd + lambdaRequestCostUsd;

        return {
            lambdaExecCostUsd: Math.round(lambdaExecCostUsd * 1000) / 1000,
            totalComputeCostUsd: Math.round(total * 1000) / 1000
        };
    }

    /**
     * Maps the economics of retrieving archived forensic evidence.
     */
    public calculateRetrievalEconomics(
        bytesToRestore: number,
        tier: 'expedited' | 'standard' | 'bulk' = 'standard'
    ): RetrievalCostReport {
        const gigabytes = bytesToRestore / (1024 * 1024 * 1024);
        
        let costPerGb = 0.01;
        let latencyMinutes = 240; // 4 hours standard

        if (tier === 'expedited') {
            costPerGb = 0.03; // expedited restore cost
            latencyMinutes = 5; // 5 mins
        } else if (tier === 'bulk') {
            costPerGb = 0.0025; // bulk restore cost
            latencyMinutes = 720; // 12 hours
        }

        // Add standard AWS data transfer out egress cost if forensic analysis is external
        const egressCost = gigabytes * this.dataTransferOutEgressPricePerGb;
        const totalRetrievalCost = (gigabytes * costPerGb) + egressCost;

        return {
            bytesRestored: bytesToRestore,
            retrievalCostUsd: Math.round(totalRetrievalCost * 100) / 100,
            latencyMinutes
        };
    }

    /**
     * Models alert fatigue labor loss, SRE cognitive saturation, and MTTR degradation.
     */
    public calculateAlertFatigueLaborLoss(alertCountPerDay: number): FatigueLaborReport {
        // Assume each alert averages 20 minutes (0.33 hours) of SRE context-switching and triage time.
        const alertsTriageTimeHours = (alertCountPerDay * 20) / 60;
        const productivityLossUsd = alertsTriageTimeHours * this.baseSreHourlyRate;

        // Effective hourly rate goes down as SRE is distracted by non-actionable alert noise
        // Max fatigue threshold clamped to avoid division issues
        const fatiguePercent = Math.min(0.8, alertCountPerDay * 0.04);
        const effectiveHourlyRate = this.baseSreHourlyRate * (1.0 - fatiguePercent);

        // MTTR is inflated by fatigue (distraction increases debug time)
        const mttrMultiplier = 1.0 + (alertCountPerDay * 0.08);

        return {
            alertsTriageTimeHours: Math.round(alertsTriageTimeHours * 100) / 100,
            productivityLossUsd: Math.round(productivityLossUsd * 100) / 100,
            effectiveHourlyRate: Math.round(effectiveHourlyRate * 100) / 100,
            mttrMultiplier: Math.round(mttrMultiplier * 100) / 100
        };
    }
}
