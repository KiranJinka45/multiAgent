export interface NumaMeminfoEntry {
    timestamp: string;
    nodeId: number;
    metricName: string; // e.g. "Dirty", "Writeback", "MemFree"
    valueKb: number;
}

export interface NumaAnalysisResult {
    totalSamples: number;
    starvationEvents: number;
    quarantineTriggered: boolean;
    overloadedNodes: number[];
}

export class NumaStarvationAnalyzer {
    // Defines the max dirty memory allowed per NUMA node before triggering starvation quarantine
    // E.g. simulating vm.dirty_background_ratio threshold hit
    private static readonly MAX_DIRTY_KB_PER_NODE = 500 * 1024; // 500 MB

    static analyzeTelemetry(telemetry: NumaMeminfoEntry[]): NumaAnalysisResult {
        let starvationEvents = 0;
        const overloadedNodes = new Set<number>();

        for (const entry of telemetry) {
            if (entry.metricName === 'Dirty' || entry.metricName === 'Writeback') {
                if (entry.valueKb > this.MAX_DIRTY_KB_PER_NODE) {
                    starvationEvents++;
                    overloadedNodes.add(entry.nodeId);
                }
            }
        }

        return {
            totalSamples: telemetry.length,
            starvationEvents,
            quarantineTriggered: starvationEvents > 0,
            overloadedNodes: Array.from(overloadedNodes)
        };
    }
}
