import { DistributedExecutionContext } from './execution-context';
import logger from '@config/logger';
import { eventBus } from '@shared/services/event-bus';
import { repairQueue, plannerQueue, architectureQueue, generatorQueue, validatorQueue, dockerQueue, deployQueue } from '@libs/utils';

export type SupervisorDecision = 'RETRY' | 'REPAIR' | 'ABORT' | 'NONE';

export class SupervisorService {
    private static STUCK_TIMEOUT_MS = 5 * 60 * 1000; // 5 minutes

    async checkHealth(executionId: string): Promise<SupervisorDecision> {
        const context = new DistributedExecutionContext(executionId);
        const data = await context.get();

        if (!data || data.status === 'completed' || data.status === 'failed') {
            return 'NONE';
        }

        const now = Date.now();
        const lastUpdate = new Date(data.metrics.startTime).getTime(); // Fallback
        const latestAgentUpdate = Object.values(data.agentResults).reduce((acc, res) => {
            const time = new Date(res.endTime || res.startTime).getTime();
            return time > acc ? time : acc;
        }, lastUpdate);

        const durationSinceLastUpdate = now - latestAgentUpdate;

        // 1. Detect Stuck Jobs (Timeout)
        if (durationSinceLastUpdate > SupervisorService.STUCK_TIMEOUT_MS) {
            logger.warn({ executionId, durationSinceLastUpdate }, '[Supervisor] Job appears stuck');
            return 'RETRY';
        }

        // 2. Detect Explicit Failures in Agent Results
        const failedAgent = Object.values(data.agentResults).find(r => r.status === 'failed');
        if (failedAgent) {
            logger.info({ executionId, agent: failedAgent.agentName }, '[Supervisor] Detected failed agent stage');

            // If it's a generator or validator failure, try to REPAIR
            if (['GeneratorAgent', 'ValidatorAgent', 'BackendAgent', 'FrontendAgent'].includes(failedAgent.agentName)) {
                return 'REPAIR';
            }

            return 'RETRY';
        }

        return 'NONE';
    }

    async handleDecision(executionId: string, decision: SupervisorDecision) {
        if (decision === 'NONE') return;

        const context = new DistributedExecutionContext(executionId);
        const data = await context.get();
        if (!data) return;

        await eventBus.agent(executionId, 'SupervisorAgent', 'recovery_triggered', `Supervisor detected issue. Taking action: ${decision}`);

        if (decision === 'REPAIR') {
            await repairQueue.add('repair-build', {
                executionId,
                projectId: data.projectId,
                prompt: data.prompt
            });
        } else if (decision === 'RETRY') {
            const currentStage = data.currentStage;
            const stageQueueMap: Record<string, any> = {
                'planner': plannerQueue,
                'architecture': architectureQueue,
                'generator': generatorQueue,
                'validator': validatorQueue,
                'docker': dockerQueue,
                'deploy': deployQueue
            };

            const queue = stageQueueMap[currentStage] || plannerQueue;
            await queue.add('retry-job', {
                executionId: data.executionId,
                projectId: data.projectId,
                userId: data.userId,
                prompt: data.prompt
            });
        }
    }
}

export const supervisorService = new SupervisorService();
