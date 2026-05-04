import { db } from '@packages/db';
import { eventBus } from '@packages/events';
import { logger } from '@packages/observability';

export interface ValidationResult {
    drift: boolean;
    discrepancies: string[];
    details: {
        dbStatus: string;
        eventCount: number;
        stepConsistency: boolean;
    };
}

/**
 * TRUTH VALIDATION LAYER
 * Hardens the platform by auditing for data drift between the SQL primary state (DB)
 * and the event-driven timeline (Redis Streams).
 */
export class TruthValidator {
    /**
     * Cross-checks the mission state in the database against the event stream history.
     * Flags drift if critical transitions (e.g., STARTED -> COMPLETED) are missing in either source.
     */
    static async validateMission(missionId: string): Promise<ValidationResult> {
        const discrepancies: string[] = [];
        
        try {
            // 1. Fetch DB state
            const mission = await db.mission.findUnique({
                where: { id: missionId },
                include: { steps: true }
            });

            if (!mission) {
                return { 
                    drift: true, 
                    discrepancies: ['Mission not found in database'],
                    details: { dbStatus: 'MISSING', eventCount: 0, stepConsistency: false }
                };
            }

            // 2. Fetch Event Stream state (Replay history)
            const streamKey = `build:stream:${missionId}`;
            const events = await eventBus.replayStream(streamKey);

            // Extract event types from the enveloped or raw payload
            const eventTypes = events.map(e => {
                const data = e.data;
                return data.type || data.payload?.type || 'unknown';
            });

            // Audit Logic: Terminal state sync
            if (mission.status === 'completed' && !eventTypes.includes('MISSION_COMPLETED') && !eventTypes.includes('mission_completed')) {
                discrepancies.push('DB shows completed but MISSION_COMPLETED event is missing from stream');
            }

            if (mission.status === 'failed' && !eventTypes.includes('MISSION_FAILED') && !eventTypes.includes('mission_failed')) {
                discrepancies.push('DB shows failed but MISSION_FAILED event is missing from stream');
            }

            // Audit Logic: Step count sync
            const dbStepCount = mission.steps.filter(s => s.status === 'completed').length;
            const streamStepEvents = eventTypes.filter(t => t === 'STEP_COMPLETED' || t === 'step_completed').length;
            
            if (dbStepCount > streamStepEvents) {
                discrepancies.push(`Persistence Lag: DB has ${dbStepCount} completed steps, but Stream only saw ${streamStepEvents}`);
            } else if (streamStepEvents > dbStepCount) {
                discrepancies.push(`Event Overflow: Stream saw ${streamStepEvents} completed steps, but DB only persisted ${dbStepCount}`);
            }

            const drift = discrepancies.length > 0;
            
            if (drift) {
                logger.warn({ missionId, discrepancies }, '⚠️ [TruthValidator] State drift detected');
                
                // Automaticaly trigger a 'recovery_event' if drift is severe (Phase 15: Self-Healing)
                if (discrepancies.length >= 2) {
                    await eventBus.publishStream(`system:incidents`, {
                        type: 'STATE_DRIFT_DETECTED',
                        severity: 'MEDIUM',
                        missionId,
                        discrepancies
                    });
                }
            }

            return {
                drift,
                discrepancies,
                details: {
                    dbStatus: mission.status,
                    eventCount: events.length,
                    stepConsistency: dbStepCount === streamStepEvents
                }
            };
        } catch (err: any) {
            logger.error({ err, missionId }, '[TruthValidator] Validation failed');
            return {
                drift: true,
                discrepancies: [`Validation engine error: ${err.message}`],
                details: { dbStatus: 'ERROR', eventCount: 0, stepConsistency: false }
            };
        }
    }
}
