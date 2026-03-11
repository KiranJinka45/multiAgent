import { freeQueue, proQueue } from './queue';
import { Mission } from '../types/mission';
import crypto from 'crypto';
import logger from '../config/logger';
import { missionController } from './mission-controller';
import { Queue } from 'bullmq';

export const commandGateway = {
    async submitMission(userId: string, projectId: string, prompt: string, options: { isFastPreview?: boolean, missionId?: string, queue?: Queue } = {}) {
        const missionId = options.missionId || crypto.randomUUID();
        const elog = logger.child({ missionId, projectId, userId });

        try {
            elog.info('Gateway: Validating mission request');
            
            if (!prompt || prompt.length < 10) {
                throw new Error('Prompt is too short to initiate a mission.');
            }

            const mission: Mission = {
                id: missionId,
                projectId,
                userId,
                prompt,
                status: 'queued',
                createdAt: Date.now(),
                updatedAt: Date.now(),
                metadata: {
                    fastPath: options.isFastPreview ?? true
                }
            };

            // 1. Register mission state in Redis
            await missionController.createMission(mission);

            // 2. Enqueue for processing
            const queueToUse = options.queue || freeQueue;
            await queueToUse.add('build-init', {
                projectId,
                executionId: missionId,
                userId,
                prompt,
                isFastPreview: options.isFastPreview ?? true
            }, {
                jobId: `gen:${projectId}:${missionId}`,
                removeOnComplete: true
            });

            elog.info({ queue: queueToUse.name }, 'Gateway: Mission successfully enqueued');

            return {
                success: true,
                missionId,
                mission
            };

        } catch (error) {
            elog.error({ error }, 'Gateway: Failed to submit mission');
            return {
                success: false,
                error: error instanceof Error ? error.message : String(error)
            };
        }
    }
};
