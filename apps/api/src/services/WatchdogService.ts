import { redis, logger, MissionService, queueManager, QUEUE_FREE, GlobalStateSyncService } from "@packages/utils";
import { db } from "@packages/db";

const STALE_TIMEOUT_MS = 10 * 60 * 1000; // 10 minutes
const POLLING_INTERVAL_MS = 60 * 1000; // 1 minute

/**
 * MissionWatchdog
 * 
 * High-Availability Self-Healing Service.
 * Reconciles missions that were orphaned due to worker crashes or network failure.
 */
export class WatchdogService {
    private static interval: NodeJS.Timeout | null = null;

    /**
     * Starts the healing loop.
     */
    static start() {
        if (this.interval) return;
        
        logger.info("[WATCHDOG] Initializing Autonomous Recovery Mesh...");
        this.interval = setInterval(() => this.scanAndRecover(), POLLING_INTERVAL_MS);
        
        // Initial scan on boot
        this.scanAndRecover();
    }

    /**
     * Scans for stale missions and restores them.
     */
    static async scanAndRecover() {
        try {
            logger.debug("[WATCHDOG] Scanning for stale missions...");

            // Find missions in active but non-complete states
            const staleMissions = await db.mission.findMany({
                where: {
                    status: { in: ["PENDING", "RUNNING"] },
                    updatedAt: { lt: new Date(Date.now() - STALE_TIMEOUT_MS) }
                }
            });

            if (staleMissions.length === 0) return;

            // GLOBAL FAILOVER CHECK
            const globalHealth = await GlobalStateSyncService.getGlobalHealth();
            const localRegion = process.env.AWS_REGION || 'us-east-1';
            const localStatus = globalHealth[localRegion];
            let failoverTarget: string | null = null;

            if (localStatus && localStatus.confidence < 70) {
                const neighbor = Object.entries(globalHealth).find(([region, state]: any) => region !== localRegion && state.confidence >= 90);
                if (neighbor) failoverTarget = neighbor[0];
            }

            logger.warn({ count: staleMissions.length, failoverTarget }, "[WATCHDOG] Found orphaned missions. Attempting recovery...");

            for (const mission of staleMissions) {
                await this.recoverMission(mission.id, failoverTarget);
            }
        } catch (err: any) {
            logger.error({ error: err.message }, "[WATCHDOG] Recovery cycle failed");
        }
    }

    private static async recoverMission(missionId: string, failoverTarget: string | null = null) {
        try {
            logger.info({ missionId, failoverTarget }, "[WATCHDOG] Re-stacking orphaned mission...");

            // 1. Update status to PENDING for retry visibility
            await db.mission.update({
                where: { id: missionId },
                data: { 
                    status: "PENDING",
                    updatedAt: new Date(),
                    // In a real setup, we'd set a 'targetRegion' field here
                }
            });

            // 2. Re-queue
            // If failoverTarget is set, we'd normally push to a global queue or cross-region event bus
            await queueManager.add(QUEUE_FREE, { missionId, failoverTarget });

            logger.info({ missionId, failoverTarget }, "[WATCHDOG] Mission successfully re-queued");
        } catch (err: any) {
            logger.error({ missionId, error: err.message }, "[WATCHDOG] Failed to recover mission");
        }
    }

    static stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
        }
    }
}
