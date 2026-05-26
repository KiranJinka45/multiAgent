export interface Alert {
    id: string;
    type: string;
    message: string;
    timestamp: number;
}

export interface CollapsedAlert extends Alert {
    duplicateCount: number;
    collapsedIds: string[];
}

export class OperatorLoadReducer {
    private readonly alertWindowMs = 300000; // 5-minute sliding window

    /**
     * Collapses duplicate alerts of the same type within a sliding window to prevent SRE alert storms.
     */
    public collapseAlerts(alerts: Alert[], windowMs: number = this.alertWindowMs): CollapsedAlert[] {
        if (alerts.length === 0) return [];

        const sorted = [...alerts].sort((a, b) => a.timestamp - b.timestamp);
        const collapsed: CollapsedAlert[] = [];

        for (const alert of sorted) {
            let merged = false;

            // Search back for an existing bucket of the same type within the window
            for (let i = collapsed.length - 1; i >= 0; i--) {
                const target = collapsed[i];
                const timeDiff = alert.timestamp - target.timestamp;

                if (timeDiff > windowMs) break; // Past window boundary

                if (target.type === alert.type) {
                    target.duplicateCount++;
                    target.collapsedIds.push(alert.id);
                    // Update timestamp to the latest occurrence
                    target.timestamp = alert.timestamp;
                    merged = true;
                    break;
                }
            }

            if (!merged) {
                collapsed.push({
                    ...alert,
                    duplicateCount: 1,
                    collapsedIds: []
                });
            }
        }

        return collapsed;
    }

    /**
     * Analyzes dashboard widget usage and recommends pruning redundant or unviewed layouts.
     */
    public simplifyDashboardComplexity(
        activeWidgets: string[],
        widgetViews: Record<string, number>
    ): { recommendedPruning: string[]; currentWidgetCount: number; targetWidgetCount: number } {
        const recommendedPruning: string[] = [];

        for (const widget of activeWidgets) {
            const views = widgetViews[widget] || 0;
            if (views < 5) { // Viewed less than 5 times
                recommendedPruning.push(widget);
            }
        }

        return {
            recommendedPruning,
            currentWidgetCount: activeWidgets.length,
            targetWidgetCount: activeWidgets.length - recommendedPruning.length
        };
    }
}
