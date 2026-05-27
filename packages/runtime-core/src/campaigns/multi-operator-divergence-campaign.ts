/**
 * ZTAN Phase Ω.2 - Multi-Operator Divergence Campaign
 * 
 * DESIGN CONSTRAINTS:
 * 1. Passive social/cognitive bias forensics.
 * 2. Never mutates runtime behavior or transitions state.
 * 3. Advisory analysis of timeline selection diversity.
 */

export interface OperatorNarrative {
    operatorId: string;
    timestamp: number;
    selectedEventIds: string[];
    narrativeNotes: string;
}

export interface ConvergencePressureMetric {
    averageJaccardSimilarity: number;
    convergenceThreshold: number;
    isConverged: boolean; // Highly converged suggests cherry-picking / team consensus bias
}

export interface TimelineOmissionReport {
    omittedEventIds: string[];
    omissionRate: number; // omitted/total events
}

export interface NarrativeDivergenceCampaignReport {
    campaignId: string;
    timestamp: number;
    operatorCount: number;
    convergence: ConvergencePressureMetric;
    omissions: TimelineOmissionReport;
    narrativeDiversityIndex: number; // HHI (0.0 to 1.0) where 1.0 represents absolute dominant narrative collapse
    advisoryWarnings: string[];
}

export class MultiOperatorDivergenceCampaign {

    /**
     * Runs the Multi-Operator Divergence Campaign.
     * Evaluates operator narratives against the complete, actual chronological telemetry timeline.
     * Detects alignment bias, omission rates, and narrative convergence pressure.
     */
    public runDivergenceCampaign(
        campaignId: string,
        narratives: OperatorNarrative[],
        completeTimelineEventIds: string[]
    ): NarrativeDivergenceCampaignReport {
        if (narratives.length === 0) {
            throw new Error('Divergence campaign requires at least one operator narrative.');
        }

        const advisoryWarnings: string[] = [];

        // 1. Calculate Jaccard similarity across operator timeline selections (Convergence Pressure)
        const convergence = this.calculateConvergence(narratives);
        if (convergence.isConverged) {
            advisoryWarnings.push('HIGH NARRATIVE CONVERGENCE: Operator timelines are statistically identical. High risk of team consensus bias or dominant-operator cherry-picking.');
        }

        // 2. Calculate Omissions from the definitive timeline
        const omissions = this.calculateOmissions(narratives, completeTimelineEventIds);
        if (omissions.omissionRate > 0.40) {
            advisoryWarnings.push(`HIGH TIMELINE OMISSION: Operators have collectively omitted ${Math.round(omissions.omissionRate * 100)}% of definitive chronological events. Critical forensic evidence may be suppressed.`);
        }

        // 3. Compute Herfindahl-Hirschman Index (HHI) for narrative diversity
        // Identifies if one narrative has collapsed diversity completely (dominated by a single operator)
        const narrativeDiversityIndex = this.calculateNarrativeDiversityIndex(narratives);
        if (narrativeDiversityIndex > 0.80) {
            advisoryWarnings.push('DOMINANT NARRATIVE COLLAPSE: A single operator timeline dominates the collective pool of narratives. Independent verification is highly compromised.');
        }

        return {
            campaignId,
            timestamp: Date.now(),
            operatorCount: narratives.length,
            convergence,
            omissions,
            narrativeDiversityIndex,
            advisoryWarnings
        };
    }

    private calculateConvergence(narratives: OperatorNarrative[]): ConvergencePressureMetric {
        const threshold = 0.85; // Jaccard > 0.85 indicates extreme alignment
        if (narratives.length === 1) {
            return {
                averageJaccardSimilarity: 1.0,
                convergenceThreshold: threshold,
                isConverged: false
            };
        }

        let totalSimilarity = 0;
        let pairsCount = 0;

        for (let i = 0; i < narratives.length; i++) {
            const setA = new Set(narratives[i].selectedEventIds);
            for (let j = i + 1; j < narratives.length; j++) {
                const setB = new Set(narratives[j].selectedEventIds);
                
                // Jaccard = Intersection / Union
                const intersection = new Set([...setA].filter(x => setB.has(x)));
                const union = new Set([...setA, ...setB]);

                const similarity = union.size > 0 ? intersection.size / union.size : 1.0;
                totalSimilarity += similarity;
                pairsCount++;
            }
        }

        const averageJaccardSimilarity = Math.round((totalSimilarity / pairsCount) * 100) / 100;
        const isConverged = averageJaccardSimilarity >= threshold;

        return {
            averageJaccardSimilarity,
            convergenceThreshold: threshold,
            isConverged
        };
    }

    private calculateOmissions(narratives: OperatorNarrative[], completeTimelineEventIds: string[]): TimelineOmissionReport {
        if (completeTimelineEventIds.length === 0) {
            return { omittedEventIds: [], omissionRate: 0.0 };
        }

        // Collect all event IDs selected by ANY operator
        const selectedByAny = new Set<string>();
        for (const n of narratives) {
            n.selectedEventIds.forEach(id => selectedByAny.add(id));
        }

        // Identify complete timeline events that are completely omitted across all narratives
        const omittedEventIds = completeTimelineEventIds.filter(id => !selectedByAny.has(id));
        const omissionRate = Math.round((omittedEventIds.length / completeTimelineEventIds.length) * 100) / 100;

        return {
            omittedEventIds,
            omissionRate
        };
    }

    private calculateNarrativeDiversityIndex(narratives: OperatorNarrative[]): number {
        // Count frequencies of event occurrences across all operator selections
        const freqMap = new Map<string, number>();
        let totalSelections = 0;

        for (const n of narratives) {
            for (const id of n.selectedEventIds) {
                freqMap.set(id, (freqMap.get(id) || 0) + 1);
                totalSelections++;
            }
        }

        if (totalSelections === 0) return 0.0;

        // Compute HHI = sum of (market shares)^2
        let hhi = 0;
        for (const [_, count] of freqMap.entries()) {
            const share = count / totalSelections;
            hhi += share * share;
        }

        return Math.round(hhi * 100) / 100;
    }
}
