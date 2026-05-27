export interface RatioReport {
    isCompliant: boolean;
    governancePercentage: number;
    surplusLoc: number; // amount of lines of code to prune to reach compliance
    allowedGovernanceLoc: number;
    error?: string;
}

export class RuntimeToGovernanceRatioTracker {
    private readonly maxRatio = 0.15; // Max 15% governance footprint relative to runtime

    /**
     * Enforces strict codebase boundaries, ensuring telemetry and policies do not dwarf the execution runtime.
     */
    public evaluateCodebaseRatio(runtimeLoc: number, governanceLoc: number): RatioReport {
        const allowedGovernanceLoc = Math.round(runtimeLoc * this.maxRatio);
        const governancePercentage = runtimeLoc > 0 ? (governanceLoc / runtimeLoc) : 0;
        const isCompliant = governanceLoc <= allowedGovernanceLoc;
        const surplusLoc = Math.max(0, governanceLoc - allowedGovernanceLoc);

        let error: string | undefined;
        if (!isCompliant) {
            error = `Governance Hypertrophy alert. Governance footprint of ${governanceLoc} LOC exceeds the allowed maximum of ${allowedGovernanceLoc} LOC (Limit: ${this.maxRatio * 100}% of runtime, Current: ${(governancePercentage * 100).toFixed(1)}%). Requires pruning at least ${surplusLoc} lines of governance code.`;
        }

        return {
            isCompliant,
            governancePercentage: Math.round(governancePercentage * 10000) / 10000,
            surplusLoc,
            allowedGovernanceLoc,
            error
        };
    }
}
