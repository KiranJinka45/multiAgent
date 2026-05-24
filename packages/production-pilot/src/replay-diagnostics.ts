import type { JournaledEffect } from './journal.js';
import type { IngressCallbackLog } from './ingress-journal.js';
import { ztanDivergenceEventsTotal } from '@packages/observability';

export interface TimelineEvent {
    type: 'side-effect' | 'ingress-boundary';
    id: string;
    name: string;
    details: any;
    order: number;
}

export interface TraceComparisonResult {
    diverged: boolean;
    mismatchIndex?: number;
    mismatchType?: 'count' | 'event-type' | 'event-name' | 'payload-mismatch';
    details?: string;
}

export class ReplayTraceInspector {
    /**
     * Compiles events from side-effect and ingress journals into a unified execution timeline.
     */
    public static compileTimeline(
        sideEffects: JournaledEffect[],
        ingressLogs: IngressCallbackLog[]
    ): TimelineEvent[] {
        const events: TimelineEvent[] = [];
        let order = 0;

        for (const effect of sideEffects) {
            events.push({
                type: 'side-effect',
                id: effect.effectId,
                name: effect.name,
                details: {
                    outcome: effect.outcome,
                    result: effect.result,
                    error: effect.error
                },
                order: order++
            });
        }

        for (const log of ingressLogs) {
            events.push({
                type: 'ingress-boundary',
                id: log.ingressId,
                name: log.boundary,
                details: {
                    payload: log.payload,
                    originalOrder: log.order
                },
                order: order++
            });
        }

        // Sort by their original execution sequence
        return events.sort((a, b) => a.order - b.order);
    }
}

export class DeterminismDiffEngine {
    /**
     * Diffs two execution timelines to isolate where and why a replay execution drifted.
     */
    public static compareTraces(
        baseline: TimelineEvent[],
        replay: TimelineEvent[]
    ): TraceComparisonResult {
        if (baseline.length !== replay.length) {
            ztanDivergenceEventsTotal.inc({ workflow_name: 'unknown', mismatch_type: 'count' });
            return {
                diverged: true,
                mismatchType: 'count',
                details: `Baseline timeline has ${baseline.length} events, but replay timeline has ${replay.length} events.`
            };
        }

        for (let i = 0; i < baseline.length; i++) {
            const baseEv = baseline[i];
            const repEv = replay[i];

            if (baseEv.type !== repEv.type) {
                ztanDivergenceEventsTotal.inc({ workflow_name: 'unknown', mismatch_type: 'event-type' });
                return {
                    diverged: true,
                    mismatchIndex: i,
                    mismatchType: 'event-type',
                    details: `Event type mismatch at sequence index ${i}. Expected '${baseEv.type}', got '${repEv.type}'.`
                };
            }

            if (baseEv.name !== repEv.name) {
                ztanDivergenceEventsTotal.inc({ workflow_name: 'unknown', mismatch_type: 'event-name' });
                return {
                    diverged: true,
                    mismatchIndex: i,
                    mismatchType: 'event-name',
                    details: `Event name/boundary mismatch at sequence index ${i}. Expected '${baseEv.name}', got '${repEv.name}'.`
                };
            }

            const baseDetails = JSON.stringify(baseEv.details);
            const repDetails = JSON.stringify(repEv.details);
            if (baseDetails !== repDetails) {
                ztanDivergenceEventsTotal.inc({ workflow_name: 'unknown', mismatch_type: 'payload-mismatch' });
                return {
                    diverged: true,
                    mismatchIndex: i,
                    mismatchType: 'payload-mismatch',
                    details: `Execution payload drift detected at sequence index ${i} ('${baseEv.name}'). Expected: ${baseDetails}, Got: ${repDetails}`
                };
            }
        }

        return { diverged: false };
    }
}

export class SnapshotBrowser {
    /**
     * Lists active state snapshots, hashes, and sequences.
     */
    public static listSnapshots(snapshots: Map<number, any>): { sequence: number; hash: string }[] {
        return Array.from(snapshots.entries())
            .map(([sequence, snapshot]) => ({
                sequence,
                hash: snapshot.stateHash || 'unknown'
            }))
            .sort((a, b) => a.sequence - b.sequence);
    }
}
