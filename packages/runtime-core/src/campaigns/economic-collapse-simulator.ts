/**
 * ZTAN Phase Ω.2 - Economic Collapse Simulator
 * 
 * DESIGN CONSTRAINTS:
 * 1. Simulates telemetry reductions, retention cuts, and staffing collapses.
 * 2. Purely advisory modeling and forecasting.
 * 3. Never mutates production databases or telemetry retention.
 */

export interface EconomicCollapseScenario {
    scenarioId: string;
    telemetryReductionPercent: number; // 0% to 100%
    retentionCutPercent: number;       // 0% to 100%
    remainingOperatorsCount: number;   // active operator headcount
    budgetCutPercent: number;          // maintenance budget cut percent
}

export interface CollapseImpactAssessment {
    telemetryReadabilityScore: number;  // 0.0 to 1.0
    retentionIntegrityScore: number;    // 0.0 to 1.0
    operatorQuorumFeasible: boolean;    // can we execute multi-operator ceremonies?
    governanceStabilityScore: number;  // 0.0 to 1.0
}

export interface EconomicCollapseCampaignReport {
    campaignId: string;
    timestamp: number;
    scenariosAuditedCount: number;
    minimumSurvivableScenarioReached: boolean;
    overallEconomicSurvivabilityScore: number; // 0.0 to 1.0
    advisoryWarnings: string[];
    assessments: Record<string, CollapseImpactAssessment>;
}

export class EconomicCollapseSimulator {

    /**
     * Executes the Economic Collapse Simulator Campaign.
     * Simulates various severe resource reduction scenarios and models ZTAN's ability
     * to maintain sovereignty, archaeology readability, and bounded governance bounds.
     */
    public runEconomicCollapseCampaign(
        campaignId: string,
        scenarios: EconomicCollapseScenario[],
        requiredCeremonyQuorum: number = 2
    ): EconomicCollapseCampaignReport {
        const assessments: Record<string, CollapseImpactAssessment> = {};
        const advisoryWarnings: string[] = [];
        let minimumSurvivableScenarioReached = true;
        let cumulativeSurvivability = 0;

        for (const scenario of scenarios) {
            // 1. Model Telemetry Readability Impact
            // Higher telemetry reduction leaves fewer telemetry points, lowering forensics readability
            const telemetryReadabilityScore = Math.max(0.1, 1.0 - (scenario.telemetryReductionPercent / 100));

            // 2. Model Retention Integrity Impact
            // Massive retention cuts delete ancient audit logs, reducing replay validation capabilities
            const retentionIntegrityScore = Math.max(0.2, 1.0 - (scenario.retentionCutPercent / 100));

            // 3. Model Operator Quorum Feasibility
            // If headcount drops below required ceremony quorum, governance proposals are blocked (deadlock)
            const operatorQuorumFeasible = scenario.remainingOperatorsCount >= requiredCeremonyQuorum;

            // 4. Model Governance Stability Impact
            // Severe budget cuts degrade backing infrastructure (e.g. replica count, disk speed)
            const governanceStabilityScore = Math.max(0.3, 1.0 - (scenario.budgetCutPercent / 100));

            const scenarioScore = (telemetryReadabilityScore + retentionIntegrityScore + (operatorQuorumFeasible ? 1.0 : 0.0) + governanceStabilityScore) / 4.0;
            cumulativeSurvivability += scenarioScore;

            if (scenarioScore < 0.5 || !operatorQuorumFeasible) {
                minimumSurvivableScenarioReached = false;
                advisoryWarnings.push(`UNSURVIVABLE SCENARIO '${scenario.scenarioId}': Sovereignty score ${Math.round(scenarioScore * 100)}% is below survival baseline. Ceremony quorum is ${operatorQuorumFeasible ? 'preserved' : 'BROKEN (deadlock)'}.`);
            }

            assessments[scenario.scenarioId] = {
                telemetryReadabilityScore: Math.round(telemetryReadabilityScore * 100) / 100,
                retentionIntegrityScore: Math.round(retentionIntegrityScore * 100) / 100,
                operatorQuorumFeasible,
                governanceStabilityScore: Math.round(governanceStabilityScore * 100) / 100
            };
        }

        const overallEconomicSurvivabilityScore = scenarios.length > 0
            ? Math.round((cumulativeSurvivability / scenarios.length) * 100) / 100
            : 1.0;

        if (overallEconomicSurvivabilityScore < 0.70) {
            advisoryWarnings.push('HIGH ECONOMIC VULNERABILITY: Under severe budget contractions and operator attrition, ZTAN will enter HIBERNATION due to quorum breakdown.');
        }

        return {
            campaignId,
            timestamp: Date.now(),
            scenariosAuditedCount: scenarios.length,
            minimumSurvivableScenarioReached,
            overallEconomicSurvivabilityScore,
            advisoryWarnings,
            assessments
        };
    }
}
