/**
 * ZTAN Phase Ω.3 - Institutional Silence Detector
 * 
 * DESIGN CONSTRAINTS:
 * 1. Tracks sociotechnical decay and ignored recovery drill patterns.
 * 2. STRICTLY advisory-only. Never punitive or authoritative.
 * 3. Bounded operational indicators. Zero autonomous recovery loops.
 */

export interface OverrideIncident {
    incidentId: string;
    timestamp: number;
    operatorId: string;
    ruleOverridden: string;
    rationaleProvided: boolean;
    repeatedIncidentCount: number; // number of times overridden by same operator in short period
}

export interface StewardshipActivity {
    lastReviewTimestamp: number;
    drillCadenceDays: number;
    totalIgnoredAdvisoryReportsCount: number;
    activeOperatorsCount: number;
}

export interface SilenceAssessmentReport {
    campaignId: string;
    timestamp: number;
    lastDrillElapsedDays: number;
    ignoredAdvisoriesCount: number;
    overrideNormalizationScore: number; // 0.0 to 1.0 where 1.0 represents high override normalization (desensitization)
    institutionalDecayRisk: number;       // 0.0 to 1.0 overall sociotechnical risk
    passed: boolean;
    advisoryWarnings: string[];
}

export class InstitutionalSilenceDetector {

    /**
     * Calculates override normalization index to evaluate whether operators
     * are desensitized to warning banners or routinely bypassing invariants.
     */
    public measureOverrideNormalization(incidents: OverrideIncident[]): number {
        if (incidents.length === 0) return 0.0;

        let totalScore = 0;
        for (const inc of incidents) {
            let score = 0.2; // base bypass score
            
            if (!inc.rationaleProvided) {
                score += 0.4; // high risk if bypass without writing rationale
            }
            if (inc.repeatedIncidentCount > 3) {
                score += 0.4; // repeat bypasses imply muscle-memory desensitization
            }

            totalScore += score;
        }

        return Math.round(Math.min(1.0, totalScore / incidents.length) * 100) / 100;
    }

    /**
     * Computes the number of days elapsed since the last verified recovery drill,
     * highlighting skipped operational training blocks.
     */
    public detectDrillElapsedTime(lastReviewTimestamp: number): number {
        const diffMs = Date.now() - lastReviewTimestamp;
        return Math.max(0, Math.round(diffMs / (1000 * 60 * 60 * 24)));
    }

    /**
     * Runs the Institutional Silence Detection Campaign.
     * Computes a unified sociotechnical decay risk score to guide organization governance.
     */
    public runSilenceDetection(
        campaignId: string,
        activity: StewardshipActivity,
        incidents: OverrideIncident[]
    ): SilenceAssessmentReport {
        const advisoryWarnings: string[] = [];

        // 1. Calculate drill elapsed time
        const lastDrillElapsedDays = this.detectDrillElapsedTime(activity.lastReviewTimestamp);
        if (lastDrillElapsedDays > activity.drillCadenceDays * 1.5) {
            advisoryWarnings.push(`SKIPPED RECOVERY DRILL: ${lastDrillElapsedDays} days elapsed since last verified operational recovery drill. Drill cadence limit is ${activity.drillCadenceDays} days.`);
        }

        // 2. Audit ignored advisory reports count
        const ignoredAdvisoriesCount = activity.totalIgnoredAdvisoryReportsCount;
        if (ignoredAdvisoriesCount > 5) {
            advisoryWarnings.push(`EXCESSIVE UNRESOLVED REPORTS: ${ignoredAdvisoriesCount} active advisory validation reports were closed without operational review logs.`);
        }

        // 3. Compute override normalization index
        const overrideNormalizationScore = this.measureOverrideNormalization(incidents);
        if (overrideNormalizationScore > 0.70) {
            advisoryWarnings.push('WARNING DESENSITIZATION: Operators display high override normalization frequencies. Critical invariants are regularly bypassed with minimal narrative accountability.');
        }

        // 4. Compute overall Institutional Decay Risk
        let riskAccumulator = 0.0;
        if (lastDrillElapsedDays > activity.drillCadenceDays) {
            riskAccumulator += 0.3;
        }
        if (ignoredAdvisoriesCount > 3) {
            riskAccumulator += 0.3;
        }
        if (overrideNormalizationScore > 0.50) {
            riskAccumulator += 0.4;
        }
        
        const institutionalDecayRisk = Math.round(riskAccumulator * 100) / 100;
        const passed = institutionalDecayRisk < 0.60;

        if (!passed) {
            advisoryWarnings.push('SOCIOTECHNICAL FAILURE ALERT: System displays high sociotechnical silence. Governance activities have become purely ceremonial.');
        }

        return {
            campaignId,
            timestamp: Date.now(),
            lastDrillElapsedDays,
            ignoredAdvisoriesCount,
            overrideNormalizationScore,
            institutionalDecayRisk,
            passed,
            advisoryWarnings
        };
    }
}
