import { TelemetryEvent } from '../chronology/replay-compressor.js';

export interface DynamicInteractionAnomaly {
    type: 'VALIDATOR_CASCADE' | 'POLICY_DEADLOCK' | 'RETRY_STORM' | 'OVERRIDE_LOOP';
    description: string;
    affectedComponents: string[];
    severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface DynamicConflictReport {
    anomalies: DynamicInteractionAnomaly[];
    totalEventsAudited: number;
}

export class DynamicInteractionArchaeologist {
    private readonly cascadeWindowMs = 5000; // 5 seconds
    private readonly deadlockWindowMs = 2000; // 2 seconds

    /**
     * Audits telemetry event streams to identify emergent dynamic conflicts,
     * cascades, retry storms, and operator override loops.
     */
    public auditDynamicInteractions(events: TelemetryEvent[]): DynamicConflictReport {
        const anomalies: DynamicInteractionAnomaly[] = [];
        if (events.length === 0) {
            return { anomalies, totalEventsAudited: 0 };
        }

        const sorted = [...events].sort((a, b) => a.timestamp - b.timestamp);

        // 1. Detect Validator Cascades (A -> B -> A -> B -> A pattern within cascadeWindowMs)
        for (let i = 0; i < sorted.length - 4; i++) {
            const e1 = sorted[i];
            const e2 = sorted[i + 1];
            const e3 = sorted[i + 2];
            const e4 = sorted[i + 3];
            const e5 = sorted[i + 4];

            const timeDiff = e5.timestamp - e1.timestamp;
            if (timeDiff <= this.cascadeWindowMs) {
                const type1 = e1.type.toUpperCase();
                const type2 = e2.type.toUpperCase();

                const isCascade = 
                    type1.includes('CHECK') && type2.includes('CHECK') &&
                    type1 !== type2 &&
                    e3.type.toUpperCase() === type1 &&
                    e4.type.toUpperCase() === type2 &&
                    e5.type.toUpperCase() === type1;

                if (isCascade) {
                    anomalies.push({
                        type: 'VALIDATOR_CASCADE',
                        description: `Emergent validator cascade loop detected between '${e1.type}' and '${e2.type}' (triggered 5 times within ${timeDiff}ms).`,
                        affectedComponents: [e1.type, e2.type],
                        severity: 'HIGH'
                    });
                    i += 4; // skip ahead to avoid duplicate reports
                }
            }
        }

        // 2. Detect Policy Deadlocks (contradictory actions like LOCK/UNLOCK on the same target within deadlockWindowMs)
        for (let i = 0; i < sorted.length - 1; i++) {
            const e1 = sorted[i];
            const e2 = sorted[i + 1];

            const timeDiff = e2.timestamp - e1.timestamp;
            if (timeDiff <= this.deadlockWindowMs) {
                const t1 = e1.type.toUpperCase();
                const t2 = e2.type.toUpperCase();

                const target1 = e1.payload?.target || e1.payload?.resource;
                const target2 = e2.payload?.target || e2.payload?.resource;

                if (target1 && target1 === target2) {
                    const isDeadlock = 
                        (t1.includes('LOCK') && t2.includes('UNLOCK')) ||
                        (t1.includes('ACQUIRE') && t2.includes('RELEASE')) ||
                        (t1.includes('ENABLE') && t2.includes('DISABLE'));

                    if (isDeadlock) {
                        anomalies.push({
                            type: 'POLICY_DEADLOCK',
                            description: `Emergent policy deadlock detected on target '${target1}' due to rapid contradictory actions '${e1.type}' and '${e2.type}'.`,
                            affectedComponents: [target1],
                            severity: 'HIGH'
                        });
                    }
                }
            }
        }

        // 3. Detect Retry Storms (high frequency of retries/backoffs)
        let retryCount = 0;
        const retryComponents = new Set<string>();
        for (const event of sorted) {
            const typeLower = event.type.toLowerCase();
            if (typeLower.includes('retry') || typeLower.includes('backoff')) {
                retryCount++;
                const comp = event.payload?.component || event.payload?.node || 'unknown';
                retryComponents.add(comp);
            }
        }

        if (retryCount >= 5) {
            anomalies.push({
                type: 'RETRY_STORM',
                description: `Mutually amplifying retry storm detected: ${retryCount} retry attempts logged across ${retryComponents.size} components.`,
                affectedComponents: Array.from(retryComponents),
                severity: 'MEDIUM'
            });
        }

        // 4. Detect Operator Override Loops (Override -> Re-trigger validation -> Override within short window)
        for (let i = 0; i < sorted.length - 2; i++) {
            const e1 = sorted[i];
            const e2 = sorted[i + 1];
            const e3 = sorted[i + 2];

            const t1 = e1.type.toUpperCase();
            const t2 = e2.type.toUpperCase();
            const t3 = e3.type.toUpperCase();

            if (t1.includes('OVERRIDE') && (t2.includes('VALIDAT') || t2.includes('CHECK')) && t3.includes('OVERRIDE')) {
                const operator = e1.payload?.operator || e3.payload?.operator || 'SRE';
                anomalies.push({
                    type: 'OVERRIDE_LOOP',
                    description: `Operator override loop detected. Operator '${operator}' performed multiple sequential overrides overridden by automated checks.`,
                    affectedComponents: [operator],
                    severity: 'HIGH'
                });
                i += 2;
            }
        }

        return {
            anomalies,
            totalEventsAudited: events.length
        };
    }
}
