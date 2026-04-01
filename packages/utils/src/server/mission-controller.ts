import { redis } from './redis';
import { Mission, MissionUpdate, MissionStatus } from '@packages/contracts';
import { logger } from '@packages/observability';
import { eventBus } from './event-bus';
import { Queue } from 'bullmq';
import { DEPLOYMENT_QUEUE, QUEUE_FREE, QUEUE_PRO } from './redis';

// Note: circular dependency if we import from apps/api/src/services/websocket
// We'll use a callback or eventBus to decouple

import path from 'path';
import fs from 'fs';

class MissionController {
    private PREFIX = 'mission:';

    async createMission(mission: Mission): Promise<void> {
        const key = `${this.PREFIX}${mission.id}`;
        await redis.setex(key, 86400, JSON.stringify(mission)); // 24h expiry
        logger.info({ missionId: mission.id }, 'Mission state initialized in Redis');
        
        // Broadcast initialization
        await eventBus.stage(mission.id, mission.status, 'in_progress', 'Mission initialized', 0, mission.projectId);

        // --- Audit Log: Creation ---
        const { AuditLogger } = await import('./audit-logger');
        await AuditLogger.log({
            organizationId: mission.userId, // Defaulting to userId as tenantId for now
            userId: mission.userId,
            action: 'mission_created',
            resource: mission.id,
            metadata: { projectId: mission.projectId, prompt: mission.prompt.substring(0, 100) }
        });
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
             
             // --- Audit Log: Status Transition ---
             const { AuditLogger } = await import('./audit-logger');
             await AuditLogger.log({
                 organizationId: updated.userId,
                 userId: updated.userId,
                 action: 'mission_status_transition',
                 resource: missionId,
                 metadata: { from: existing.status, to: updated.status }
             });

             const STATUS_PROGRESS: Record<string, number> = {
                'init': 5, 'queued': 10, 'planning': 15, 'graph_ready': 25, 'executing': 45,
                'building': 60, 'repairing': 70, 'assembling': 80, 'deploying': 90, 'previewing': 95, 'complete': 100, 'failed': 0
            };
            await eventBus.stage(
                missionId, 
                updated.status, 
                (updated.status as string) === 'complete' ? 'completed' : 'in_progress',
                `Stage: ${updated.status}`,
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
                // If we're moving to 'complete', we map it to 'ready' for the product flow
                const nextStatus = (update.status as string) === 'complete' ? 'ready' : update.status as MissionStatus;
                
                if (!this.validateTransition(existing.status, nextStatus)) {
                    logger.error({ missionId, from: existing.status, to: nextStatus }, 'INVALID transition rejected by Pipeline State Guard');
                    return existing;
                }
                updated.status = nextStatus;
            }
            return updated;
        });
    }

    async addLog(missionId: string, stage: string, message: string): Promise<void> {
        await this.atomicUpdate(missionId, (existing) => {
            const logs = (existing.metadata.logs as unknown[]) || [];
            logs.push({
                timestamp: Date.now(),
                stage,
                message
            });
            return {
                ...existing,
                metadata: {
                    ...existing.metadata,
                    logs
                }
            };
        });
        
        // Fix signature: thought(executionId, agent, thought)
        await eventBus.thought(missionId, stage, message);
    }

    async setFailed(missionId: string, error: string): Promise<void> {
        await this.updateMission(missionId, {
            status: 'failed',
            metadata: { error }
        });
    }

    async listActiveMissions(): Promise<Mission[]> {
        if (!redis || redis.status !== 'ready') {
            logger.warn('[MissionController] Redis client not ready');
            return [];
        }
        const keys = await redis.keys(`${this.PREFIX}*`);
        if (!keys || keys.length === 0) return [];
        
        const missions: Mission[] = [];
        
        for (const key of keys) {
            const data = await redis.get(key);
            if (data) {
                const mission = JSON.parse(data) as Mission;
                if (!['ready', 'failed', 'completed'].includes(mission.status)) {
                    missions.push(mission);
                }
            }
        }
        
        return missions;
    }

    private validateTransition(current: string, next: string): boolean {
        const allowed: Record<string, string[]> = {
            'init': ['queued', 'planning', 'failed'],
            'queued': ['planning', 'failed'],
            'planning': ['generating', 'failed'],
            'generating': ['validating', 'failed'],
            'validating': ['deploying', 'failed'],
            'deploying': ['ready', 'failed'],
            'ready': ['deploying'],
            'failed': ['init']
        };

        const allowedNext = allowed[current] || [];
        // Add existing legacy status for backward compatibility if needed, 
        // but for now focus on the new product-aligned flow.
        return allowedNext.includes(next) || next === 'failed';
    }
    
    async triggerDeployment(missionId: string): Promise<void> {
        const mission = await this.getMission(missionId);
        if (!mission) throw new Error('Mission not found');
        
        // Push to deployment queue
        const deployQueue = new Queue(DEPLOYMENT_QUEUE, { connection: redis });
        await deployQueue.add('deploy-manual', {
            projectId: mission.projectId,
            executionId: mission.id,
            sandboxDir: mission.metadata.sandboxDir, // Ensure this exists from build stage
            userId: mission.userId
        });
        
        // Update status
        await this.updateMission(missionId, { status: 'deploying' });
        logger.info({ missionId, projectId: mission.projectId }, '[MissionController] Manual deployment triggered');
    }

    async triggerExecution(missionId: string): Promise<void> {
        const mission = await this.getMission(missionId);
        if (!mission) throw new Error('Mission not found');

        const tier = mission.metadata?.tier === 'pro' ? QUEUE_PRO : QUEUE_FREE;
        const buildQueue = new Queue(tier, { connection: redis });

        await buildQueue.add('build-retry', {
            prompt: mission.prompt,
            userId: mission.userId,
            projectId: mission.projectId,
            executionId: mission.id
        });

        await this.updateMission(missionId, { status: 'queued' });
        logger.info({ missionId, tier }, '[MissionController] Execution re-triggered (re-queued)');
    }

    async requeueExecution(missionId: string, reason: string): Promise<void> {
        await this.addLog(missionId, 'auto-healer', `Re-queueing execution. Reason: ${reason}`);
        await this.triggerExecution(missionId);
    }

    async applyEvolutionPatch(missionId: string, patch: { path: string, content: string }): Promise<void> {
        const mission = await this.getMission(missionId);
        if (!mission) throw new Error('Mission not found');

        const sandboxDir = mission.metadata.sandboxDir as string;
        if (!sandboxDir) throw new Error('Sandbox directory not found for mission');

        const filePath = path.join(sandboxDir, patch.path.startsWith('/') ? patch.path.slice(1) : patch.path);
        const folderPath = path.dirname(filePath);

        if (!fs.existsSync(folderPath)) {
            fs.mkdirSync(folderPath, { recursive: true });
        }

        fs.writeFileSync(filePath, patch.content, 'utf8');
        
        await this.addLog(missionId, 'evolution', `Surgical patch applied autonomously to: ${patch.path}`);
        logger.info({ missionId, path: patch.path }, '[MissionController] Evolution patch applied');
    }
}

export const missionController = new MissionController();
