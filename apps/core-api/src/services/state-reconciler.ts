import Redis from 'ioredis';
import { db } from '@packages/db';
import { logger } from '@packages/observability';

const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';

interface BuildEvent {
    executionId: string;
    type: 'progress' | 'thought' | 'agent' | 'complete' | 'error';
    projectId: string; // Scoped to Project (Mission)
    payload: any;
}

export class StateReconciler {
    private subscriber: Redis;

    constructor() {
        this.subscriber = new Redis(REDIS_URL);
    }

    public async connect() {
        this.subscriber.subscribe('build-events', (err) => {
            if (err) {
                logger.error({ err }, '[StateReconciler] Failed to subscribe to build-events');
                return;
            }
            logger.info('[StateReconciler] Subscribed to Redis build-events for persistence sync');
        });

        this.subscriber.on('message', async (channel, message) => {
            if (channel === 'build-events') {
                await this.handleEvent(message);
            }
        });
    }

    private async handleEvent(message: string) {
        try {
            const event: BuildEvent = JSON.parse(message);
            const { executionId, type, projectId, payload } = event;

            if (!projectId) return;

            switch (type) {
                case 'complete':
                    await this.updateMissionStatus(projectId, 'completed');
                    await this.saveBuildMetrics(projectId, payload);
                    break;
                case 'error':
                    await this.updateMissionStatus(projectId, 'failed', payload?.error);
                    break;
                case 'progress':
                    // Optional: Update last active timestamp
                    break;
            }
        } catch (err) {
            logger.error({ err }, '[StateReconciler] Event processing failure');
        }
    }

    private async saveBuildMetrics(projectId: string, payload: any) {
        try {
            await db.buildMetric.create({
                data: {
                    projectId,
                    tokensUsed: Number(payload.tokensUsed || 0),
                    durationMs: Number(payload.durationMs || 0),
                    costUsd: Number(payload.costUsd || 0),
                    status: 'completed'
                }
            });
            logger.info({ projectId }, '[StateReconciler] Persisted build metrics');
        } catch (err) {
            logger.error({ err, projectId }, '[StateReconciler] Failed to persist metrics');
        }
    }

    private async updateMissionStatus(id: string, status: 'completed' | 'failed', error?: string) {
        try {
            // Note: Project model in schema.prisma corresponds to a "Mission" in this context
            await db.project.update({
                where: { id },
                data: { 
                    status,
                    updatedAt: new Date(),
                    // If we had a detailed log field, we'd append here
                }
            });
            logger.info({ id, status }, '[StateReconciler] Reconciled mission state in DB');
        } catch (err) {
            logger.error({ err, id }, '[StateReconciler] DB Sync failure');
        }
    }
}

export const stateReconciler = new StateReconciler();
