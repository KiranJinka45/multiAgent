import { freeQueue, eventBus } from '@libs/utils/server';
import { Mission } from '@libs/contracts';
import crypto from 'crypto';
import { logger } from '@libs/observability';
import { missionController } from '@libs/utils/server';
import { Queue } from 'bullmq';
// eventBus removed from here as it's now combined in @libs/utils/server import above

export const commandGateway = {
    async submitMission(userId: string, projectId: string, prompt: string, options: { isFastPreview?: boolean, missionId?: string, queue?: Queue, template?: string } = {}) {
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
                    fastPath: options.isFastPreview ?? true,
                    template: options.template
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
                template: options.template,
                isFastPreview: options.isFastPreview ?? true
            }, {
                jobId: `gen:${projectId}:${missionId}`,
                removeOnComplete: true
            });

            // 3. Immediately broadcast initial queued state to UI via unified event bus
            await eventBus.progress(
                missionId, 
                0, 
                'Mission successfully enqueued', 
                'queued', 
                'queued', 
                projectId
            );

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
