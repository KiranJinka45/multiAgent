export interface OperatorConfidenceEvent {
    operatorId: string;
    actionType: string;
    confidenceScore: number; // 0 to 1
    calibrationAccuracy: number; // match between operator and system
}

/**
 * Human Operational Trust Engine (Sustainability Phase)
 * 
 * Measures operator confidence, cognitive load, and trust calibration 
 * to ensure the platform remains operationally understandable and calm.
 */
export class HumanTrustEngine {
    private confidenceEvents: OperatorConfidenceEvent[] = [];

    /**
     * Records an operator confidence measurement.
     */
    public recordConfidence(event: OperatorConfidenceEvent): void {
        console.log(`[TRUST] Recording confidence for ${event.operatorId} on ${event.actionType}: ${Math.round(event.confidenceScore * 100)}%`);
        this.confidenceEvents.push(event);
    }

    /**
     * Aggregates trust stability metrics.
     */
    public getTrustScorecard(): { averageConfidence: number, trustStability: number } {
        if (this.confidenceEvents.length === 0) return { averageConfidence: 1, trustStability: 1 };

        const avg = this.confidenceEvents.reduce((acc, e) => acc + e.confidenceScore, 0) / this.confidenceEvents.length;
        return {
            averageConfidence: avg,
            trustStability: 0.98 // Placeholder for stability coefficient
        };
    }
}
