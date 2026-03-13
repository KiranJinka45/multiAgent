import { redis } from './queue';
import { Mission, MissionUpdate } from '../types/mission';
import logger from '../config/logger';
import { eventBus } from './event-bus';

class MissionController {
    private PREFIX = 'mission:';

    async createMission(mission: Mission): Promise<void> {
        const key = `${this.PREFIX}${mission.id}`;
        await redis.setex(key, 86400, JSON.stringify(mission)); // 24h expiry
        logger.info({ missionId: mission.id }, 'Mission state initialized in Redis');
        
        // Broadcast initialization
        await eventBus.stage(mission.id, mission.status, 'in_progress', 'Mission initialized', 0, mission.projectId);
    }

    async getMission(missionId: string): Promise<Mission | null> {
        const data = await redis.get(`${this.PREFIX}${missionId}`);
        return data ? JSON.parse(data) : null;
    }

    async atomicUpdate(missionId: string, mutator: (mission: Mission) => Mission | Promise<Mission>): Promise<void> {
        const key = `${this.PREFIX}${missionId}`;
        
        // Simulating an atomic operation via LUA or simple LOCK-FREE versioning/snapshotting
        // For local dev, a simple internal critical section or just a standard SET of the full object suffices
        // if we ensure we read-modify-write correctly.
        const existing = await this.getMission(missionId);
        if (!existing) {
            logger.warn({ missionId }, 'Attempted atomic update on non-existent mission');
            return;
        }

        const updated = await mutator(existing);
        updated.updatedAt = Date.now();

        await redis.setex(key, 86400, JSON.stringify(updated));

        // Broadcast if status changed
        if (updated.status !== existing.status) {
             logger.info({ missionId, from: existing.status, to: updated.status }, '[MissionController] Atomic Transition');
             const STATUS_PROGRESS: Record<string, number> = {
                'queued': 5, 'planning': 15, 'generating': 40, 'patching': 60,
                'building': 80, 'deployment': 95, 'completed': 100, 'failed': 0
            };
            await eventBus.stage(
                missionId, 
                updated.status, 
                updated.status === 'completed' ? 'completed' : 'in_progress',
                `Status: ${updated.status}`,
                STATUS_PROGRESS[updated.status] || 0,
                updated.projectId
            );
        }
    }

    async updateMission(missionId: string, update: MissionUpdate): Promise<void> {
        return this.atomicUpdate(missionId, (existing) => {
            const updated: Mission = {
                ...existing,
                ...update,
                metadata: {
                    ...existing.metadata,
                    ...(update.metadata || {})
                }
            };

            if (update.status && update.status !== existing.status) {
                if (!this.validateTransition(existing.status, update.status)) {
                    logger.error({ missionId, from: existing.status, to: update.status }, 'INVALID transition rejected by Pipeline State Guard');
                    return existing; // Don't change status
                }
                updated.status = update.status;
            }
            return updated;
        });
    }

    async setFailed(missionId: string, error: string): Promise<void> {
        await this.updateMission(missionId, {
            status: 'failed',
            metadata: { error }
        });
    }

    async listActiveMissions(): Promise<Mission[]> {
        const keys = await redis.keys(`${this.PREFIX}*`);
        const missions: Mission[] = [];
        
        for (const key of keys) {
            const data = await redis.get(key);
            if (data) {
                const mission = JSON.parse(data) as Mission;
                if (!['completed', 'failed'].includes(mission.status)) {
                    missions.push(mission);
                }
            }
        }
        
        return missions;
    }
    private validateTransition(current: string, next: string): boolean {
        const allowed: Record<string, string[]> = {
            'queued': ['planning', 'failed'],
            'planning': ['generating', 'failed'],
            'generating': ['patching', 'failed'],
            'patching': ['building', 'failed'],
            'building': ['deployment', 'repairing', 'failed'],
            'repairing': ['building', 'failed'],
            'deployment': ['completed', 'failed'],
            'completed': [], // Terminal
            'failed': ['queued'] // Allow retry
        };

        const allowedNext = allowed[current] || [];
        return allowedNext.includes(next);
    }
}

export const missionController = new MissionController();
