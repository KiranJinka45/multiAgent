export interface QuarantineIncident {
    incidentId: string;
    timestamp: Date;
    causeClassification: string;
    wasFalsePositive: boolean;
}

/**
 * ─── ZTAN Quarantine Frequency Analyzer ──────────────────────────────────────
 * Records quarantine events and evaluates false-positive rates to ensure
 * SRE operators are not fatigued by noise thresholds.
 * ────────────────────────────────────────────────────────────────────────────
 */
export class QuarantineFrequencyAnalyzer {
    private incidents: QuarantineIncident[] = [];

    /**
     * Registers a new node quarantine occurrence
     */
    public logIncident(incidentId: string, causeClassification: string, wasFalsePositive = false): void {
        this.incidents.push({
            incidentId,
            timestamp: new Date(),
            causeClassification,
            wasFalsePositive
        });
    }

    /**
     * Marks a previously registered incident as a false positive (operator validated)
     */
    public markAsFalsePositive(incidentId: string): void {
        const incident = this.incidents.find(i => i.incidentId === incidentId);
        if (incident) {
            incident.wasFalsePositive = true;
        }
    }

    /**
     * Compute statistical analysis on quarantine history
     */
    public calculateMetrics() {
        const total = this.incidents.length;
        const falsePositives = this.incidents.filter(i => i.wasFalsePositive).length;
        const truePositives = total - falsePositives;
        const falsePositiveRate = total > 0 ? (falsePositives / total) : 0;

        // Group by classification causes
        const causeBreakdown: Record<string, number> = {};
        for (const i of this.incidents) {
            causeBreakdown[i.causeClassification] = (causeBreakdown[i.causeClassification] || 0) + 1;
        }

        return {
            totalQuarantines: total,
            trueQuarantines: truePositives,
            falsePositiveQuarantines: falsePositives,
            falsePositiveRate: parseFloat(falsePositiveRate.toFixed(4)),
            byCause: causeBreakdown
        };
    }

    /**
     * Clears local incident statistics
     */
    public reset(): void {
        this.incidents = [];
    }
}
