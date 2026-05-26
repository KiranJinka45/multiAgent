export interface OperatorRationale {
    overrideId: string;
    rationale: string;
    operatorName: string;
    timestamp: number;
    playbookLineage: string;
    decisionProvenance: string;
    overrideRationale: string;
    abandonedTelemetryAncestry: string[];
    context: Record<string, any>;
}

export interface DecisionRecord {
    decisionId: string;
    operatorName: string;
    timestamp: number;
    chosenHypothesis: string;
    alternativeHypotheses: string[];
    actualOutcomeRootCause: string; // The true cause discovered later
    confidenceLevel: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface HypothesisDecayReport {
    totalDecisionsAudited: number;
    wrongPathwaysCount: number;
    accuracyRate: number;
    wrongPathwaysDetail: Array<{ chosen: string; actual: string; count: number }>;
    operatorTrustAudit: Record<string, { totalDecisions: number; overTrustedCount: number; trustScore: number }>;
    recurringBiasPatterns: string[];
}

export interface ResurrectedRecord {
    resurrectionId: string;
    subsystemName: string;
    operatorName: string;
    timestamp: number;
    requestContext: {
        restorationReason: string;
        expectedBlastRadius: 'LOW' | 'MEDIUM' | 'HIGH';
        survivabilityCategory: 'catastrophic' | 'operational' | 'convenience';
        reRetirementCondition: string;
        telemetryDeltaEstimate: number; // 0.0 to 1.0
        rollbackPlan: string;
        sunsetDays: number;
        coSignatures?: string[];
    };
}

export interface ActualResurrectionOutcome {
    resurrectionId: string;
    actualBlastRadius: 'LOW' | 'MEDIUM' | 'HIGH';
    actualTelemetryDelta: number; // 0.0 to 1.0
    actualMaintenanceBurden: number;
    actualSurvivabilityGain: 'HIGH' | 'MEDIUM' | 'LOW' | 'NONE';
}

export interface GroupConsensusBiasReport {
    consensusOptimismDetected: boolean;
    groupResurrectionBiasScore: number; // proportion of total forecasts that were underestimations
    correlatedForecastingFailures: Array<{
        subsystemName: string;
        operatorsInvolved: string[];
        underestimatedFields: string[];
        severityScore: number; // 0 to 1 based on severity of combined underestimations
        contagionIndex: number;
    }>;
    temporalClusteringDetected: boolean;
    confidenceContagionFactor: number;
}

export interface ResurrectionAuditReport {
    totalAudited: number;
    underestimatedBlastRadiusCount: number;
    underestimatedTelemetryDeltaCount: number;
    averagePredictionAccuracy: number; // 0.0 to 1.0
    operatorAccuracyScores: Record<string, {
        totalResurrections: number;
        accuracyScore: number; // 0.0 to 1.0
        optimismBiasDetected: boolean;
    }>;
    groupConsensusBias?: GroupConsensusBiasReport;
    warnings: string[];
}

export class StewardshipMemoryPreservator {
    private rationales = new Map<string, OperatorRationale>();
    private operatorSeniorities = new Map<string, 'JUNIOR' | 'SENIOR' | 'LEAD'>();
    
    // Internal lists for automated forgetting/compaction
    private historicalDecisionsList: DecisionRecord[] = [];
    private resurrectionRecordsList: ResurrectedRecord[] = [];
    private resurrectionOutcomesList: ActualResurrectionOutcome[] = [];

    // Compacted base states
    private compactedDecisionsCount = 0;
    private compactedWrongPathwaysCount = 0;
    private compactedResurrectionsCount = 0;
    private compactedUnderestimatedBlastRadiusCount = 0;
    private compactedUnderestimatedTelemetryCount = 0;
    private compactedAccuracySum = 0;

    /**
     * Registers an operator's seniority role to weight forecasting models.
     */
    public registerOperatorSeniority(name: string, role: 'JUNIOR' | 'SENIOR' | 'LEAD'): void {
        this.operatorSeniorities.set(name, role);
    }

    /**
     * Returns an operator's registered seniority or defaults to JUNIOR.
     */
    public getOperatorSeniority(name: string): 'JUNIOR' | 'SENIOR' | 'LEAD' {
        return this.operatorSeniorities.get(name) || 'JUNIOR';
    }

    /**
     * Records a decision record to the internal history list.
     */
    public addDecisionRecord(record: DecisionRecord): void {
        this.historicalDecisionsList.push(record);
    }

    /**
     * Records a resurrection event and optional outcomes to the internal history list.
     */
    public addResurrectionRecord(record: ResurrectedRecord, outcome?: ActualResurrectionOutcome): void {
        this.resurrectionRecordsList.push(record);
        if (outcome) {
            this.resurrectionOutcomesList.push(outcome);
        }
    }

    /**
     * Saves operator reasoning, playbook lineage, and decision context.
     */
    public recordOperatorRationale(rationale: OperatorRationale): void {
        this.rationales.set(rationale.overrideId, rationale);
    }

    /**
     * Retrieves stored operator rationale.
     */
    public getOperatorRationale(overrideId: string): OperatorRationale | undefined {
        return this.rationales.get(overrideId);
    }

    /**
     * Compacts/anonymizes history records older than maxAgeMs to prevent database bloat,
     * maintaining base statistics while forgetting specific SRE names and playbooks.
     */
    public forgetStaleHistory(maxAgeMs: number): void {
        const currentTime = Date.now();
        const cutoff = currentTime - maxAgeMs;

        // 1. Compact Decisions
        const activeDecisions: DecisionRecord[] = [];
        for (const decision of this.historicalDecisionsList) {
            if (decision.timestamp < cutoff) {
                this.compactedDecisionsCount++;
                const isCorrect = decision.chosenHypothesis === decision.actualOutcomeRootCause;
                if (!isCorrect) {
                    this.compactedWrongPathwaysCount++;
                }
            } else {
                activeDecisions.push(decision);
            }
        }
        this.historicalDecisionsList = activeDecisions;

        // 2. Compact Resurrections
        const outcomesMap = new Map<string, ActualResurrectionOutcome>();
        this.resurrectionOutcomesList.forEach(o => outcomesMap.set(o.resurrectionId, o));

        const activeResurrections: ResurrectedRecord[] = [];
        const activeOutcomes: ActualResurrectionOutcome[] = [];

        const blastRadiusVal = { 'LOW': 1, 'MEDIUM': 2, 'HIGH': 3 };

        for (const res of this.resurrectionRecordsList) {
            if (res.timestamp < cutoff) {
                this.compactedResurrectionsCount++;
                const outcome = outcomesMap.get(res.resurrectionId);
                if (outcome) {
                    const predRadius = blastRadiusVal[res.requestContext.expectedBlastRadius];
                    const actualRadius = blastRadiusVal[outcome.actualBlastRadius];
                    
                    if (predRadius < actualRadius) {
                        this.compactedUnderestimatedBlastRadiusCount++;
                    }
                    if (res.requestContext.telemetryDeltaEstimate < outcome.actualTelemetryDelta) {
                        this.compactedUnderestimatedTelemetryCount++;
                    }

                    const telemetryAccuracy = 1 - Math.abs(res.requestContext.telemetryDeltaEstimate - outcome.actualTelemetryDelta);
                    const radiusAccuracy = 1 - Math.abs(predRadius - actualRadius) / 2;
                    this.compactedAccuracySum += (telemetryAccuracy + radiusAccuracy) / 2;
                    activeOutcomes.push(outcome); // Keep for reference or let activeOutcomes prune if outcome wasn't matched
                } else {
                    this.compactedAccuracySum += 1.0; // default ideal accuracy if no outcome available
                }
            } else {
                activeResurrections.push(res);
                const outcome = outcomesMap.get(res.resurrectionId);
                if (outcome) {
                    activeOutcomes.push(outcome);
                }
            }
        }
        this.resurrectionRecordsList = activeResurrections;
        this.resurrectionOutcomesList = activeOutcomes;
    }

    /**
     * Audits which diagnostic pathways were historically wrong, which operators over-trusted
     * certain narratives, and identifies recurring diagnostic bias patterns.
     */
    public auditHypothesisDecay(historicalDecisions?: DecisionRecord[]): HypothesisDecayReport {
        const decisionsToUse = historicalDecisions || this.historicalDecisionsList;
        const totalDecisionsAudited = decisionsToUse.length + this.compactedDecisionsCount;

        if (totalDecisionsAudited === 0) {
            return {
                totalDecisionsAudited: 0,
                wrongPathwaysCount: 0,
                accuracyRate: 1.0,
                wrongPathwaysDetail: [],
                operatorTrustAudit: {},
                recurringBiasPatterns: ['No historical decisions to analyze.']
            };
        }

        let wrongPathwaysCount = this.compactedWrongPathwaysCount;
        const pathwaysMap = new Map<string, number>();
        const operatorMap = new Map<string, { total: number; overTrusted: number }>();

        for (const decision of decisionsToUse) {
            const isCorrect = decision.chosenHypothesis === decision.actualOutcomeRootCause;
            
            // Track operator trust
            const opData = operatorMap.get(decision.operatorName) || { total: 0, overTrusted: 0 };
            opData.total++;

            if (!isCorrect) {
                wrongPathwaysCount++;
                const pathKey = `${decision.chosenHypothesis}->${decision.actualOutcomeRootCause}`;
                pathwaysMap.set(pathKey, (pathwaysMap.get(pathKey) || 0) + 1);

                // If chosen hypothesis was wrong but operator confidence was HIGH, mark as over-trusted
                if (decision.confidenceLevel === 'HIGH') {
                    opData.overTrusted++;
                }
            }

            operatorMap.set(decision.operatorName, opData);
        }

        const wrongPathwaysDetail: Array<{ chosen: string; actual: string; count: number }> = [];
        for (const [key, count] of pathwaysMap.entries()) {
            const [chosen, actual] = key.split('->');
            wrongPathwaysDetail.push({ chosen, actual, count });
        }

        const operatorTrustAudit: Record<string, { totalDecisions: number; overTrustedCount: number; trustScore: number }> = {};
        for (const [opName, data] of operatorMap.entries()) {
            const trustScore = data.total > 0 ? (data.total - data.overTrusted) / data.total : 1.0;
            operatorTrustAudit[opName] = {
                totalDecisions: data.total,
                overTrustedCount: data.overTrusted,
                trustScore: Math.round(trustScore * 100) / 100
            };
        }

        // Identify recurring bias patterns
        const recurringBiasPatterns: string[] = [];
        
        // 1. Check for Confirmation/Availability Bias: choosing the same wrong hypothesis repeatedly
        const wrongHypothesisCounts = new Map<string, number>();
        for (const detail of wrongPathwaysDetail) {
            wrongHypothesisCounts.set(detail.chosen, (wrongHypothesisCounts.get(detail.chosen) || 0) + detail.count);
        }
        for (const [chosen, count] of wrongHypothesisCounts.entries()) {
            if (count >= 3) {
                recurringBiasPatterns.push(`Confirmation Bias: Hypothesis '${chosen}' was incorrectly chosen as the root cause ${count} times.`);
            }
        }

        // 2. Check for Overconfidence Bias: operator trustScore is low
        for (const [opName, audit] of Object.entries(operatorTrustAudit)) {
            if (audit.overTrustedCount >= 2 && audit.trustScore < 0.70) {
                recurringBiasPatterns.push(`Overconfidence Bias: Operator '${opName}' consistently shows high confidence on incorrect diagnostics (${audit.overTrustedCount} over-trusted errors).`);
            }
        }

        if (recurringBiasPatterns.length === 0 && wrongPathwaysCount > 0) {
            recurringBiasPatterns.push('No dominant bias patterns detected, but general diagnostic deviations exist.');
        } else if (wrongPathwaysCount === 0) {
            recurringBiasPatterns.push('No bias patterns detected. Diagnostic accuracy is at 100%.');
        }

        const accuracyRate = Math.round(((totalDecisionsAudited - wrongPathwaysCount) / totalDecisionsAudited) * 100) / 100;

        return {
            totalDecisionsAudited,
            wrongPathwaysCount,
            accuracyRate,
            wrongPathwaysDetail,
            operatorTrustAudit,
            recurringBiasPatterns
        };
    }

    /**
     * Audits resurrection predictions against actual outcome metrics.
     * Maps blast radius estimates and telemetry estimates to compute operator forecasting accuracy,
     * accounting for authority seniority, temporal incident clustering, and review confidence contagion.
     */
    public auditResurrectionPredictions(
        resurrections?: ResurrectedRecord[],
        outcomes?: ActualResurrectionOutcome[]
    ): ResurrectionAuditReport {
        const resToUse = resurrections || this.resurrectionRecordsList;
        const outToUse = outcomes || this.resurrectionOutcomesList;

        const totalAudited = resToUse.length + this.compactedResurrectionsCount;
        if (totalAudited === 0) {
            return {
                totalAudited: 0,
                underestimatedBlastRadiusCount: 0,
                underestimatedTelemetryDeltaCount: 0,
                averagePredictionAccuracy: 1.0,
                operatorAccuracyScores: {},
                warnings: ['No resurrection prediction records available to audit.']
            };
        }

        const outcomesMap = new Map<string, ActualResurrectionOutcome>();
        outToUse.forEach(o => outcomesMap.set(o.resurrectionId, o));

        let underestimatedBlastRadiusCount = this.compactedUnderestimatedBlastRadiusCount;
        let underestimatedTelemetryDeltaCount = this.compactedUnderestimatedTelemetryCount;
        let totalAccuracySum = this.compactedAccuracySum;

        const operatorMap = new Map<string, { total: number; sumAccuracy: number; underestimateCount: number }>();
        const blastRadiusVal = { 'LOW': 1, 'MEDIUM': 2, 'HIGH': 3 };

        // Group by subsystem for correlated failure analysis
        const subsystemGroup = new Map<string, Array<{ res: ResurrectedRecord; outcome: ActualResurrectionOutcome }>>();
        
        // Multipliers for authority weighting
        const seniorityWeights = { 'JUNIOR': 1.0, 'SENIOR': 1.5, 'LEAD': 2.0 };
        
        // For temporal clustering tracking
        const underestimationTimestamps: number[] = [];

        // For confidence contagion tracking
        let coSignedUnderestimations = 0;

        for (const res of resToUse) {
            const outcome = outcomesMap.get(res.resurrectionId);
            if (!outcome) continue;

            const predRadius = blastRadiusVal[res.requestContext.expectedBlastRadius];
            const actualRadius = blastRadiusVal[outcome.actualBlastRadius];

            let underestimatedRadius = false;
            if (predRadius < actualRadius) {
                underestimatedBlastRadiusCount++;
                underestimatedRadius = true;
            }

            let underestimatedTelemetry = false;
            if (res.requestContext.telemetryDeltaEstimate < outcome.actualTelemetryDelta) {
                underestimatedTelemetryDeltaCount++;
                underestimatedTelemetry = true;
            }

            // Accuracy metrics (0.0 to 1.0)
            const telemetryAccuracy = 1 - Math.abs(res.requestContext.telemetryDeltaEstimate - outcome.actualTelemetryDelta);
            const radiusAccuracy = 1 - Math.abs(predRadius - actualRadius) / 2;
            const singleAccuracy = (telemetryAccuracy + radiusAccuracy) / 2;

            totalAccuracySum += singleAccuracy;

            const opName = res.operatorName;
            const opData = operatorMap.get(opName) || { total: 0, sumAccuracy: 0, underestimateCount: 0 };
            opData.total++;
            opData.sumAccuracy += singleAccuracy;
            if (underestimatedRadius || underestimatedTelemetry) {
                opData.underestimateCount++;
                underestimationTimestamps.push(res.timestamp);
                if (res.requestContext.coSignatures && res.requestContext.coSignatures.length > 0) {
                    coSignedUnderestimations++;
                }
            }
            operatorMap.set(opName, opData);

            // Add to subsystem grouping
            const list = subsystemGroup.get(res.subsystemName) || [];
            list.push({ res, outcome });
            subsystemGroup.set(res.subsystemName, list);
        }

        const averagePredictionAccuracy = totalAccuracySum / totalAudited;
        const operatorAccuracyScores: Record<string, { totalResurrections: number; accuracyScore: number; optimismBiasDetected: boolean }> = {};
        const warnings: string[] = [];

        for (const [opName, data] of operatorMap.entries()) {
            const accuracyScore = data.sumAccuracy / data.total;
            const optimismBiasDetected = (data.underestimateCount / data.total > 0.50) && (accuracyScore < 0.80);

            operatorAccuracyScores[opName] = {
                totalResurrections: data.total,
                accuracyScore: Math.round(accuracyScore * 100) / 100,
                optimismBiasDetected
            };

            if (optimismBiasDetected) {
                warnings.push(`Forecasting Optimism Bias detected for operator '${opName}': consistently underestimating complexity or blast radius of resurrected subsystems.`);
            }
        }

        // --- Advanced Group Consensus Bias Auditing & Correlated Failure Analysis ---
        const correlatedForecastingFailures: Array<{
            subsystemName: string;
            operatorsInvolved: string[];
            underestimatedFields: string[];
            severityScore: number;
            contagionIndex: number;
        }> = [];

        let totalWeightedErrors = 0;
        let totalWeightedPossible = 0;

        for (const [subsystemName, items] of subsystemGroup.entries()) {
            const operatorsSet = new Set<string>();
            const fieldsSet = new Set<string>();
            let errorSum = 0;
            let underestimationsCount = 0;
            let coSignerWeightFactor = 0;

            for (const { res, outcome } of items) {
                const predRadius = blastRadiusVal[res.requestContext.expectedBlastRadius];
                const actualRadius = blastRadiusVal[outcome.actualBlastRadius];
                
                const opRole = this.getOperatorSeniority(res.operatorName);
                const M_op = seniorityWeights[opRole];

                let isUnderestimated = false;

                if (predRadius < actualRadius) {
                    fieldsSet.add('blastRadius');
                    const error = (actualRadius - predRadius) / 2;
                    errorSum += error;
                    totalWeightedErrors += error * M_op;
                    isUnderestimated = true;
                }
                if (res.requestContext.telemetryDeltaEstimate < outcome.actualTelemetryDelta) {
                    fieldsSet.add('telemetryDelta');
                    const error = (outcome.actualTelemetryDelta - res.requestContext.telemetryDeltaEstimate);
                    errorSum += error;
                    totalWeightedErrors += error * M_op;
                    isUnderestimated = true;
                }

                totalWeightedPossible += 2 * M_op;

                if (isUnderestimated) {
                    operatorsSet.add(res.operatorName);
                    underestimationsCount++;
                    
                    // Track co-signatures confidence propagation
                    if (res.requestContext.coSignatures) {
                        for (const cosigner of res.requestContext.coSignatures) {
                            const cosignerRole = this.getOperatorSeniority(cosigner);
                            coSignerWeightFactor += seniorityWeights[cosignerRole];
                        }
                    }
                }
            }

            // Correlated forecasting failure occurs if multiple events occur or multiple operators make errors
            if (underestimationsCount > 0 && (operatorsSet.size >= 2 || items.length >= 2)) {
                const severityScore = Math.min(1.0, errorSum / (items.length * 2));
                const contagionIndex = 1.0 + (coSignerWeightFactor * 0.25);

                correlatedForecastingFailures.push({
                    subsystemName,
                    operatorsInvolved: Array.from(operatorsSet),
                    underestimatedFields: Array.from(fieldsSet),
                    severityScore: Math.round(severityScore * 100) / 100,
                    contagionIndex: Math.round(contagionIndex * 100) / 100
                });
            }
        }

        // Incorporate compacted base stats into weighted calculations (assume JUNIOR weight 1.0 for compacted ones)
        totalWeightedErrors += (this.compactedUnderestimatedBlastRadiusCount + this.compactedUnderestimatedTelemetryCount) * 1.0;
        totalWeightedPossible += this.compactedResurrectionsCount * 2 * 1.0;

        // Calculate Group Resurrection Bias Score (Weighted)
        let groupResurrectionBiasScore = totalWeightedPossible > 0 ? totalWeightedErrors / totalWeightedPossible : 0.0;

        // Detect Temporal Incident Clustering (errors within 24 hours / 86400000ms of each other)
        let temporalClusteringDetected = false;
        underestimationTimestamps.sort((a, b) => a - b);
        let clusterCount = 0;
        for (let i = 0; i < underestimationTimestamps.length - 1; i++) {
            if (underestimationTimestamps[i + 1] - underestimationTimestamps[i] <= 86400000) {
                temporalClusteringDetected = true;
                clusterCount++;
            }
        }

        if (temporalClusteringDetected) {
            // Clustered incidents amplify the group bias index due to collective panic
            const clusterFactor = Math.min(1.5, 1.0 + (clusterCount * 0.1));
            groupResurrectionBiasScore = groupResurrectionBiasScore * clusterFactor;
        }

        groupResurrectionBiasScore = Math.min(1.0, Math.round(groupResurrectionBiasScore * 100) / 100);

        // Confidence Contagion Factor: lack of review independence
        const confidenceContagionFactor = Math.round(Math.min(1.5, 1.0 + (coSignedUnderestimations * 0.15)) * 100) / 100;

        // Consensus optimism threshold
        const consensusOptimismDetected = groupResurrectionBiasScore > 0.50 && correlatedForecastingFailures.length > 0;

        if (consensusOptimismDetected) {
            warnings.push(`CRITICAL: Group Consensus Optimism Synchronization detected! SRE teams are mutually reinforcing incorrect assumptions and collectively underestimating resurrection impacts.`);
        }
        if (temporalClusteringDetected) {
            warnings.push(`WARNING: Temporal clustering of forecasting failures detected. Multiple underestimations occurred within 24 hours, indicating a panic incident storm.`);
        }

        const groupConsensusBias: GroupConsensusBiasReport = {
            consensusOptimismDetected,
            groupResurrectionBiasScore,
            correlatedForecastingFailures,
            temporalClusteringDetected,
            confidenceContagionFactor
        };

        return {
            totalAudited,
            underestimatedBlastRadiusCount,
            underestimatedTelemetryDeltaCount,
            averagePredictionAccuracy: Math.round(averagePredictionAccuracy * 100) / 100,
            operatorAccuracyScores,
            groupConsensusBias,
            warnings
        };
    }
}

