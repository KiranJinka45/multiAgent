import { eventBus, DistributedExecutionContext, BuildEvent } from '@packages/utils';
import { logger } from '@packages/observability';
import { agentRegistry } from './agent-registry';

/**
 * SwarmCoordinator - The event-driven brain for Devin-level autonomy.
 * 
 * Instead of a linear orchestrator, this system reacts to build events 
 * to trigger specialized agents in a decoupled, parallel swarm.
 */
export class SwarmCoordinator {
    private activeMissions = new Set<string>();

    /**
     * Start observing a mission (executionId).
     * Connects to the Redis event stream and begins reacting to agent outputs.
     */
    async supervise(executionId: string, projectId: string) {
        if (this.activeMissions.has(executionId)) return;
        this.activeMissions.add(executionId);

        logger.info({ executionId, projectId }, '[SwarmCoordinator] Mission supervision active.');

        // Initialize background listener for this mission (non-blocking)
        this.startEventListener(executionId, projectId).catch(err => {
            logger.error({ executionId, err }, '[SwarmCoordinator] Listener background crash');
        });
    }

    private async startEventListener(executionId: string, projectId: string) {
        let lastId = '$'; // Start from new events
        const context = new DistributedExecutionContext(executionId);

        while (this.activeMissions.has(executionId)) {
            try {
                const events = await eventBus.readBuildEvents(executionId, lastId);
                if (!events) continue;

                for (const [id, event] of events) {
                    lastId = id;
                    await this.handleEvent(event, context, projectId);
                }
            } catch (err) {
                logger.error({ executionId, err }, '[SwarmCoordinator] Event listener error');
                await new Promise(r => setTimeout(r, 1000));
            }
        }
    }

    private async handleEvent(event: BuildEvent, context: DistributedExecutionContext, projectId: string) {
        const { executionId, type, agent, action, message } = event;

        // 1. Reactive Handover: Vision -> Blueprint
        if (type === 'agent' && agent === 'PlannerAgent' && action === 'planning:finished') {
            logger.info({ executionId }, '[SwarmCoordinator] Planner complete. Triggering Architect Swarm...');
            // In a swarm, the Architect reacts to the plan.
            const plan = event.metadata?.plan;
            this.triggerAgent(executionId, 'ArchitectureAgent', { prompt: event.message, plan }, context, projectId);
        }

        // 2. Reactive Handover: Blueprint -> Coder Swarm (Speculative)
        if (type === 'agent' && agent === 'ArchitectureAgent' && action === 'architecting:finished') {
            logger.info({ executionId }, '[SwarmCoordinator] Architecture ready. Launching parallel Speculative Coders...');
            
            // In a high-performance system, we don't just run one coder.
            // We spawn multiple "Speculative Coders" to explore different architectural variations.
            eventBus.agent(executionId, 'SwarmCoordinator', 'speculative_launch', 'Launching competitive Coder branches (A vs B vs C)...', projectId);
            
            // Resolve speculative branches via RankingAgent
            this.resolveSpeculation(executionId, projectId, message).catch(err => {
                logger.error({ executionId, err }, '[SwarmCoordinator] Speculation resolution failed');
            });
        }

        // 3. Autonomous Repair Loop (Reactive)
        if (type === 'error' || (type === 'stage' && event.status === 'failed')) {
            logger.warn({ executionId, message }, '[SwarmCoordinator] Failure detected. Launching Debugger Swarm...');
            // Reactive Debugging: Agents can independently decide to "heal" without the orchestrator's permission.
            this.triggerAgent(executionId, 'DebugAgent', { error: message }, context, projectId);
        }
    }

    private async triggerAgent(executionId: string, agentName: string, payload: Record<string, unknown>, context: DistributedExecutionContext, projectId: string) {
        const timer = await eventBus.startTimer(executionId, 'SwarmCoordinator', `trigger:${agentName}`, `Triggering ${agentName} autonomously...`, projectId);
        
        try {
            if (agentRegistry.hasAgent(agentName)) {
                // Execute in fire-and-forget mode or background queue
                agentRegistry.runTaskDirectly(agentName, payload, context).catch(error => {
                    logger.error({ agentName, error }, '[SwarmCoordinator] Autonomous agent trigger failed');
                });
            }
            await timer(`${agentName} triggered successfully.`);
        } catch (error) {
            void error;
            await timer(`Failed to trigger ${agentName}`);
        }
    }

    private async resolveSpeculation(executionId: string, projectId: string, originalPrompt: string) {
        logger.info({ executionId }, '[SwarmCoordinator] Resolving speculative results...');
        
        // In a real swarm, we would wait for events from different coder pods.
        // For this hardening phase, we simulate the 'Ranking' of multiple choices.
        const { RankingAgent } = await import('@packages/brain');
        const rankingAgent = new RankingAgent();
        
        // Mocking variations for demonstrating the selection logic
        const variations = [
            { id: 'branch-a', files: [{ path: 'app/page.tsx', content: '// High perf variation' }] },
            { id: 'branch-b', files: [{ path: 'app/page.tsx', content: '// Architectural variation' }] }
        ];

        const response = await rankingAgent.execute({ variations, originalPrompt }, { executionId, projectId } as any);
        
        if (response.success) {
            const bestId = response.data.selectedVariationId;
            logger.info({ executionId, bestId }, '[SwarmCoordinator] Selection complete. Promoting best variation.');
            await eventBus.agent(executionId, 'RankingAgent', 'selection', `Selected ${bestId} as the gold standard.`, projectId);
        }
    }

    stop(executionId: string) {
        this.activeMissions.delete(executionId);
    }
}

export const swarmCoordinator = new SwarmCoordinator();




