import { eventBus } from '@packages/utils';
import { freeQueue } from '@packages/queue';
import { Mission } from '@packages/contracts';
import crypto from 'crypto';
import { logger } from '@packages/observability';
import { missionController } from '@packages/utils';
import { Queue } from 'bullmq';
// eventBus removed from here as it's now combined in @packages/utils import above

export const commandGateway = {
    async submitMission(userId: string, projectId: string, prompt: string, options: { isFastPreview?: boolean, missionId?: string, queue?: Queue, template?: string, tenantId?: string, steps?: any[], title?: string } = {}) {
        const missionId = options.missionId || crypto.randomUUID();
        const elog = logger.child({ missionId, projectId, userId });

        try {
            elog.info('Gateway: Validating mission request');
            
            if (!prompt && (!options.steps || options.steps.length === 0)) {
                throw new Error('Prompt or steps are required to initiate a mission.');
            }

            const mission: any = {
                id: missionId,
                projectId,
                userId,
                prompt,
                title: options.title,
                status: 'queued',
                createdAt: Date.now(),
                updatedAt: Date.now(),
                tenantId: options.tenantId,
                metadata: {
                    fastPath: options.isFastPreview ?? true,
                    template: options.template,
                    hasSteps: (options.steps?.length || 0) > 0
                }
            };

            // 1. Register mission and steps in DB/Redis
            await missionController.createMission(mission, options.steps);

            // 2. Enqueue for processing
            const queueToUse = options.queue || freeQueue;
            await queueToUse.add('build-init', {
                projectId,
                executionId: missionId,
                userId,
                prompt,
                template: options.template,
                isFastPreview: options.isFastPreview ?? true,
                tenantId: options.tenantId
            }, {
                jobId: `gen:${projectId}:${missionId}`,
                removeOnComplete: true,
                attempts: 3,
                backoff: {
                    type: 'exponential',
                    delay: 1000
                }
            });

            // 3. Immediately broadcast initial queued state to UI via unified event bus
            await eventBus.progress(
                missionId, 
                0, 
                'Mission successfully enqueued', 
                'queued', 
                'queued', 
                projectId,
                options.tenantId
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

