import { missionController, logger, WorkerClusterManager } from '@packages/utils/server';
import { missionRecoveryTotal } from '@packages/observability';

/**
 * MissionWatchdog
 * 
 * Periodically scans for missions that have been in a non-final state 
 * for too long (i.e. 'zombie missions') and attempts to recover them.
 */
export class MissionWatchdog {
    private interval: NodeJS.Timeout | null = null;
    private STALE_THRESHOLD_MS = 3 * 60 * 1000; // 3 minutes for production
    private RECOVERY_ATTEMPTS_LIMIT = 3;

    constructor(private checkIntervalMs: number = 60000) { } // Default 1 minute check

    /**
     * Start the background watchdog loop
     */
    start() {
        if (this.interval) return;

        logger.info({ interval: this.checkIntervalMs }, '[MissionWatchdog] Starting background scanning');
        this.interval = setInterval(() => this.checkMissions(), this.checkIntervalMs);
    }

    /**
     * Stop the loop
     */
    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }

    /**
     * Diagnostic scan and recovery trigger
     */
    async checkMissions() {
        try {
            logger.debug('[MissionWatchdog] Scanning for stalled missions...');
            const activeMissions = await missionController.listActiveMissions();
            const healthyNodes = await WorkerClusterManager.getHealthyNodes();
            const healthyWorkerIds = new Set(healthyNodes.map(n => n.workerId));
            
            const now = Date.now();

            for (const mission of activeMissions) {
                const staleTime = now - (mission.updatedAt || 0);
                const assignedWorkerId = mission.metadata?.workerId;
                
                // --- DEAD WORKER DETECTION (Immediate Healing) ---
                const isOwnerDead = assignedWorkerId && !healthyWorkerIds.has(assignedWorkerId as string);
                
                if (isOwnerDead) {
                    logger.warn(
                        { missionId: mission.id, workerId: assignedWorkerId },
                        '[MissionWatchdog] Dead worker owner detected. Triggering immediate recovery.'
                    );
                    await this.recoverMission(mission, 'worker_death');
                    continue;
                }

                // --- STALE TIMEOUT DETECTION ---
                if (staleTime > this.STALE_THRESHOLD_MS) {
                    logger.warn(
                        { missionId: mission.id, status: mission.status, lastUpdate: mission.updatedAt },
                        '[MissionWatchdog] Stalled mission detected'
                    );

                    await this.recoverMission(mission, 'timeout');
                }
            }
        } catch (error) {
            logger.error({ error }, '[MissionWatchdog] Scan failed');
        }
    }

    /**
     * Autonomous recovery logic
     */
    private async recoverMission(mission, reason: string) {
        try {
            const healCount = (mission.metadata?.healCount || 0) as number;
            
            if (healCount >= this.RECOVERY_ATTEMPTS_LIMIT) {
                logger.error({ missionId: mission.id }, '[MissionWatchdog] Max recovery attempts reached. Failing mission.');
                await missionController.setFailed(mission.id, 'Mission failed after multiple automated healing attempts.');
                return;
            }

            // Log recovery attempt
            await missionController.addLog(
                mission.id,
                'auto-healer',
                `Self-healing triggered (Reason: ${reason}). Attempt ${healCount + 1}/${this.RECOVERY_ATTEMPTS_LIMIT}...`
            );

            // Increment heal count for next potentially failed cycle
            await missionController.updateMission(mission.id, { 
                metadata: { healCount: healCount + 1 } 
            });

            // Strategy: Re-trigger deployment OR Re-queue for building
            if (mission.status === 'deploying') {
                logger.info({ missionId: mission.id }, '[MissionWatchdog] Healing: Retrying deployment');
                await missionController.triggerDeployment(mission.id);
                missionRecoveryTotal.inc({ strategy: 'retry_deployment' });
            } else if (['planning', 'generating', 'building', 'executing'].includes(mission.status)) {
                logger.info({ missionId: mission.id, fromStatus: mission.status }, '[MissionWatchdog] Healing: Re-queueing task');
                // Use explicit any cast or confirm the method exists in controller
                await (missionController as any).requeueExecution(mission.id, `Watchdog recovery from ${reason}`);
                missionRecoveryTotal.inc({ strategy: 'requeue_task' });
            } else {
                logger.info({ missionId: mission.id }, '[MissionWatchdog] Forcing failure due to unknown stalling state');
                await missionController.setFailed(mission.id, `Self-healing: Unknown stall in '${mission.status}' state`);
                missionRecoveryTotal.inc({ strategy: 'fail_fast' });
            }

        } catch (error: any) {
            logger.error({ 
                missionId: mission.id, 
                error: error.message || error,
                stack: error.stack
            }, '[MissionWatchdog] Autonomous recovery failed');
        }
    }
}

export const missionWatchdog = new MissionWatchdog();
