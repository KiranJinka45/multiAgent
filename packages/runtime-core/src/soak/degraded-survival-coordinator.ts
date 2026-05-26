import { TelemetryEvent } from '../chronology/replay-compressor.js';

export interface DegradedSurvivalReport {
    degradedSurvivalMode: boolean;
    sreStaffingRatio: number;
    budgetUsageRatio: number;
    eventsProcessed: number;
    eventsPruned: number;
    bytesSaved: number;
    nonCriticalSearchIndexingActive: boolean;
    minimalDatasetEnforced: boolean;
}

export class DegradedSurvivalCoordinator {
    private degradedSurvivalMode = false;
    private sreStaffingRatio = 1.0;
    private budgetUsageRatio = 1.0;
    private eventsProcessed = 0;
    private eventsPruned = 0;
    private bytesSaved = 0;

    constructor(sreStaffingRatio = 1.0, budgetUsageRatio = 1.0) {
        this.sreStaffingRatio = sreStaffingRatio;
        this.budgetUsageRatio = budgetUsageRatio;
        this.evaluateSurvivalMode();
    }

    /**
     * Re-evaluates whether degraded survival mode should be active based on SRE staffing ratio and budget limits.
     * Toggled when staffing ratio is low (< 0.5) or budget ratio is high (> 1.2 or low budget allocation < 0.4).
     */
    public evaluateSurvivalMode(): boolean {
        // Degraded mode activates if SRE staff is under 50%, or if budget constraints are exceeded / extremely limited.
        if (this.sreStaffingRatio < 0.5 || this.budgetUsageRatio > 1.2 || this.budgetUsageRatio < 0.4) {
            this.degradedSurvivalMode = true;
        } else {
            this.degradedSurvivalMode = false;
        }
        return this.degradedSurvivalMode;
    }

    /**
     * Manually updates the staffing and budget metrics.
     */
    public updateOperationalMetrics(sreStaffingRatio: number, budgetUsageRatio: number): void {
        this.sreStaffingRatio = sreStaffingRatio;
        this.budgetUsageRatio = budgetUsageRatio;
        this.evaluateSurvivalMode();
    }

    /**
     * Process and optionally prune high-cardinality metadata fields or enforce minimal reconstructible dataset bounds.
     */
    public pruneTelemetryEvent(event: TelemetryEvent): TelemetryEvent {
        this.eventsProcessed++;

        if (!this.degradedSurvivalMode) {
            return event;
        }

        // We are in Degraded Stewardship Survival Mode.
        // Enforce the minimal reconstructible dataset bounds:
        // Preserves only:
        // - timestamp
        // - eventClass (maps to type)
        // - sourceComponent (from payload.sourceComponent or type)
        // - anomalyEntropy (maps to entropyScore)
        
        const originalBytes = JSON.stringify(event).length;

        // Keep only minimal fields in event itself:
        // And construct a highly minimized payload.
        const sourceComponent = event.payload?.sourceComponent || event.type || 'Unknown';
        const eventClass = event.payload?.eventClass || event.type || 'Unknown';
        const anomalyEntropy = event.entropyScore;

        const prunedPayload = {
            eventClass,
            sourceComponent,
            anomalyEntropy
        };

        const prunedEvent: TelemetryEvent = {
            id: event.id,
            type: eventClass,
            timestamp: event.timestamp,
            entropyScore: anomalyEntropy,
            payload: prunedPayload
        };

        const prunedBytes = JSON.stringify(prunedEvent).length;
        const saved = originalBytes - prunedBytes;
        if (saved > 0) {
            this.bytesSaved += saved;
        }

        this.eventsPruned++;
        return prunedEvent;
    }

    /**
     * Gets a detailed report of the current degraded survival coordinator status.
     */
    public getSurvivalReport(): DegradedSurvivalReport {
        return {
            degradedSurvivalMode: this.degradedSurvivalMode,
            sreStaffingRatio: this.sreStaffingRatio,
            budgetUsageRatio: this.budgetUsageRatio,
            eventsProcessed: this.eventsProcessed,
            eventsPruned: this.eventsPruned,
            bytesSaved: this.bytesSaved,
            nonCriticalSearchIndexingActive: !this.degradedSurvivalMode,
            minimalDatasetEnforced: this.degradedSurvivalMode
        };
    }
}
