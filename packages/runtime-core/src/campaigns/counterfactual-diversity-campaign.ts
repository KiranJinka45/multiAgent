/**
 * ZTAN Phase Ω.4 - Counterfactual Diversity Campaign
 * 
 * DESIGN CONSTRAINTS:
 * 1. Passive modeling of operator hypothesis exploration patterns.
 * 2. Never mutates runtime rules or interrupts operators.
 * 3. Advisory reports only. Zero autonomous recovery loops.
 */

export interface OperatorSessionMetric {
    operatorId: string;
    sessionId: string;
    timestamp: number;
    exploredBranchIds: string[];
    secondsSpentOnAlternativeHypotheses: number;
    totalActiveSeconds: number;
}

export interface HypothesisBranch {
    branchId: string;
    confidence: number;
    isAuthoritativeTimeline: boolean;
}

export interface CounterfactualDiversityReport {
    campaignId: string;
    timestamp: number;
    totalSessionsAudited: number;
    narrativeVarianceScore: number; // 0.0 to 1.0 representing narrative diversity
    cognitiveTunnelingIncidentsCount: number;
    prematureConvergenceRisk: number; // 0.0 to 1.0 overall certainty bias risk
    passed: boolean;
    advisoryWarnings: string[];
}

export class CounterfactualDiversityCampaign {

    /**
     * Calculates the statistical variance in operator narrative exploration.
     * High variance suggests balanced consideration of alternative causal paths.
     */
    public measureNarrativeVariance(sessions: OperatorSessionMetric[]): number {
        if (sessions.length === 0) return 0.0;

        const branchFrequencies = new Map<string, number>();
        let totalExploredCount = 0;

        for (const s of sessions) {
            for (const branch of s.exploredBranchIds) {
                branchFrequencies.set(branch, (branchFrequencies.get(branch) || 0) + 1);
                totalExploredCount++;
            }
        }

        if (totalExploredCount === 0) return 0.0;

        // Compute Shannon entropy over explored branches to represent narrative variance
        let entropy = 0;
        for (const [_, freq] of branchFrequencies.entries()) {
            const p = freq / totalExploredCount;
            entropy -= p * Math.log(p);
        }

        // Normalize index relative to maximum possible entropy log(n)
        const maxEntropy = Math.log(Math.max(2, branchFrequencies.size));
        return Math.round((entropy / maxEntropy) * 100) / 100;
    }

    /**
     * Identifies when an operator has hyper-focused on the primary authoritative timeline,
     * ignoring highly probable competing causal hypothesis branches.
     */
    public detectCognitiveTunneling(
        session: OperatorSessionMetric,
        allBranches: HypothesisBranch[]
    ): { tunnelingDetected: boolean; ignoredRatio: number } {
        // High-confidence alternative branches (confidence > 0.3)
        const highlyProbableAlts = allBranches.filter(b => !b.isAuthoritativeTimeline && b.confidence > 0.3);
        if (highlyProbableAlts.length === 0) {
            return { tunnelingDetected: false, ignoredRatio: 0.0 };
        }

        let exploredAltCount = 0;
        for (const alt of highlyProbableAlts) {
            if (session.exploredBranchIds.includes(alt.branchId)) {
                exploredAltCount++;
            }
        }

        const ignoredRatio = 1.0 - (exploredAltCount / highlyProbableAlts.length);
        
        // Tunneling is flagged if they ignored more than 80% of highly probable alternative branches
        // AND spent less than 10% of their session time looking at alternative timelines.
        const alternativeTimeRatio = session.totalActiveSeconds > 0
            ? session.secondsSpentOnAlternativeHypotheses / session.totalActiveSeconds
            : 0.0;

        const tunnelingDetected = ignoredRatio > 0.80 && alternativeTimeRatio < 0.10;

        return {
            tunnelingDetected,
            ignoredRatio: Math.round(ignoredRatio * 100) / 100
        };
    }

    /**
     * Runs the Counterfactual Diversity Campaign.
     * Evaluates operator focus and calculates premature convergence risk index.
     */
    public runCounterfactualCampaign(
        campaignId: string,
        sessions: OperatorSessionMetric[],
        branches: HypothesisBranch[]
    ): CounterfactualDiversityReport {
        const advisoryWarnings: string[] = [];
        let cognitiveTunnelingIncidentsCount = 0;

        // 1. Measure overall narrative variance
        const narrativeVarianceScore = this.measureNarrativeVariance(sessions);
        if (narrativeVarianceScore < 0.40) {
            advisoryWarnings.push('LOW NARRATIVE VARIANCE: Operators are considering very few alternative timelines. High risk of systemic tunnel vision.');
        }

        // 2. Audit individual operator sessions for tunneling
        for (const s of sessions) {
            const audit = this.detectCognitiveTunneling(s, branches);
            if (audit.tunnelingDetected) {
                cognitiveTunnelingIncidentsCount++;
                advisoryWarnings.push(`COGNITIVE TUNNELING DETECTED: Operator '${s.operatorId}' spent ${Math.round((s.secondsSpentOnAlternativeHypotheses / s.totalActiveSeconds) * 100)}% time exploring alternatives, ignoring ${Math.round(audit.ignoredRatio * 100)}% of viable hypotheses.`);
            }
        }

        // 3. Compute premature certainty convergence risk index
        let prematureConvergenceRisk = 0.0;
        if (narrativeVarianceScore < 0.50) prematureConvergenceRisk += 0.4;
        if (cognitiveTunnelingIncidentsCount > 0) prematureConvergenceRisk += 0.3;
        
        // If average session length spends minimal time on counterfactual branches
        let totalAltTime = 0;
        let totalTime = 0;
        sessions.forEach(s => {
            totalAltTime += s.secondsSpentOnAlternativeHypotheses;
            totalTime += s.totalActiveSeconds;
        });
        const avgAltTimeRatio = totalTime > 0 ? totalAltTime / totalTime : 0.0;
        if (avgAltTimeRatio < 0.15) {
            prematureConvergenceRisk += 0.3;
        }

        prematureConvergenceRisk = Math.round(prematureConvergenceRisk * 100) / 100;
        const passed = prematureConvergenceRisk < 0.70;

        if (!passed) {
            advisoryWarnings.push('CRITICAL COGNITIVE COLLAPSE ALERT: Operators display high narrative convergence bias, focusing strictly on confirmation timelines.');
        }

        return {
            campaignId,
            timestamp: Date.now(),
            totalSessionsAudited: sessions.length,
            narrativeVarianceScore,
            cognitiveTunnelingIncidentsCount,
            prematureConvergenceRisk,
            passed,
            advisoryWarnings
        };
    }
}
