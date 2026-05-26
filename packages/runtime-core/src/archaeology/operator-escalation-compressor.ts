import { Alert } from './operator-load-reducer.js';

export interface IncidentNarrative {
    incidentId: string;
    primaryRootCauseAlert: Alert;
    derivativeAlertsCount: number;
    suppressedAlerts: Alert[];
    chronologicalRootCauseChain: string[];
    timestamp: number;
}

export class OperatorEscalationCompressor {
    private readonly suppressionWindowMs = 300000; // 5-minute sliding window

    // Root-cause alert classifications
    private readonly rootCauses = new Set(['WAL_STALL', 'DISK_FULL', 'CLOCK_SKEW', 'KERNEL_PANIC', 'NETWORK_PARTITION']);
    
    // Mapping of root cause alert -> derivative alert types it suppresses
    private readonly derivativeMappings: Record<string, string[]> = {
        'WAL_STALL': ['REPLICA_LAG', 'HEARTBEAT_TIMEOUT'],
        'DISK_FULL': ['WAL_STALL', 'REPLICA_LAG', 'SLOW_QUERY', 'WRITE_FAIL'],
        'CLOCK_SKEW': ['HEARTBEAT_TIMEOUT', 'RETRY_STORM', 'LEASE_EXPIRED'],
        'NETWORK_PARTITION': ['HEARTBEAT_TIMEOUT', 'REPLICA_LAG', 'WRITE_FAIL'],
        'KERNEL_PANIC': ['HEARTBEAT_TIMEOUT', 'DISK_SLOW', 'LATENCY_SPIKE']
    };

    /**
     * Compresses raw SRE alerts into root-cause incident narratives with derivative suppression.
     */
    public compressIncidentNarrative(alerts: Alert[], windowMs: number = this.suppressionWindowMs): IncidentNarrative[] {
        if (alerts.length === 0) return [];

        const sortedAlerts = [...alerts].sort((a, b) => a.timestamp - b.timestamp);
        const narratives: IncidentNarrative[] = [];
        const processedIds = new Set<string>();

        // Step 1: Identify root causes and initialize narratives
        for (const alert of sortedAlerts) {
            if (this.rootCauses.has(alert.type) && !processedIds.has(alert.id)) {
                processedIds.add(alert.id);
                narratives.push({
                    incidentId: `incident_${alert.id}`,
                    primaryRootCauseAlert: alert,
                    derivativeAlertsCount: 0,
                    suppressedAlerts: [],
                    chronologicalRootCauseChain: [alert.type],
                    timestamp: alert.timestamp
                });
            }
        }

        // Step 2: Suppress and group derivative alerts into active narratives
        for (const alert of sortedAlerts) {
            if (processedIds.has(alert.id)) continue;

            let suppressed = false;

            for (const narrative of narratives) {
                const rootType = narrative.primaryRootCauseAlert.type;
                const timeDiff = alert.timestamp - narrative.primaryRootCauseAlert.timestamp;

                // Check if alert falls within the suppression window of this narrative
                if (timeDiff >= 0 && timeDiff <= windowMs) {
                    const allowedDerivatives = this.derivativeMappings[rootType] || [];
                    
                    if (allowedDerivatives.includes(alert.type)) {
                        narrative.suppressedAlerts.push(alert);
                        narrative.derivativeAlertsCount++;
                        narrative.chronologicalRootCauseChain.push(alert.type);
                        processedIds.add(alert.id);
                        suppressed = true;
                        break;
                    }
                }
            }

            // Step 3: If not suppressed and not an active root cause, treat as a standalone narrative
            if (!suppressed) {
                processedIds.add(alert.id);
                narratives.push({
                    incidentId: `incident_standalone_${alert.id}`,
                    primaryRootCauseAlert: alert,
                    derivativeAlertsCount: 0,
                    suppressedAlerts: [],
                    chronologicalRootCauseChain: [alert.type],
                    timestamp: alert.timestamp
                });
            }
        }

        // Sort final narratives by timestamp
        return narratives.sort((a, b) => a.timestamp - b.timestamp);
    }
}
