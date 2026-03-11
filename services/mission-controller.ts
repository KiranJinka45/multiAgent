import { redis } from './queue';
import { Mission, MissionUpdate } from '../types/mission';
import logger from '../config/logger';

class MissionController {
    private PREFIX = 'mission:';

    async createMission(mission: Mission): Promise<void> {
        const key = `${this.PREFIX}${mission.id}`;
        await redis.setex(key, 86400, JSON.stringify(mission)); // 24h expiry
        logger.info({ missionId: mission.id }, 'Mission state initialized in Redis');
    }

    async getMission(missionId: string): Promise<Mission | null> {
        const data = await redis.get(`${this.PREFIX}${missionId}`);
        return data ? JSON.parse(data) : null;
    }

    async updateMission(missionId: string, update: MissionUpdate): Promise<void> {
        const key = `${this.PREFIX}${missionId}`;
        const existing = await this.getMission(missionId);
        
        if (!existing) {
            logger.warn({ missionId }, 'Attempted to update non-existent mission');
            return;
        }

        const updated: Mission = {
            ...existing,
            ...update,
            metadata: {
                ...existing.metadata,
                ...(update.metadata || {})
            },
            updatedAt: Date.now()
        };

        if (update.status) {
            updated.status = update.status;
        }

        await redis.setex(key, 86400, JSON.stringify(updated));
        
        // Log status transitions
        if (update.status && update.status !== existing.status) {
            logger.info({ missionId, from: existing.status, to: update.status }, 'Mission status transitioned');
        }
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
}

export const missionController = new MissionController();
