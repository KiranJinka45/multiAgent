import pLimit from "p-limit";
import { Task, AgentRequest, AgentResponse } from '@libs/contracts';
import { agentRegistry } from '@libs/agents';
import { logger } from '@libs/utils/server';
import { DistributedExecutionContext } from "@libs/context";

const limit = pLimit(3);

export async function executeTask(task: Task, context: DistributedExecutionContext): Promise<AgentResponse> {
    return limit(async () => {
        const agentNameMap: Record<string, string> = {
            "frontend": "frontend",
            "backend": "backend",
            "database": "database",
            "security": "security",
            "monetization": "monetization",
            "deployment": "deploy",
            "monitoring": "monitor",
            "sandbox-editor": "sandbox-editor",
        };

        const registryKey = agentNameMap[task.type];
        if (!registryKey) {
            throw new Error(`No agent mapped for task type: ${task.type}`);
        }

        const agent = agentRegistry.getAgent(registryKey);
        if (!agent) {
            throw new Error(`Agent for ${registryKey} not found in registry`);
        }

        const request: AgentRequest = {
            prompt: task.description || '',
            context: context as any, // DistributedExecutionContext implements AgentContext
            tenantId: task.tenantId || 'default',
            taskType: 'code-gen',
            params: task.payload || {}
        };

        logger.info({ taskId: task.id, registryKey }, '[Executor] Starting task execution');
        const response = await agent.execute(request);

        if (response.success && response.artifacts && response.artifacts.length > 0) {
            await context.atomicUpdate(async () => {
                const vfs = context.getVFS();
                for (const artifact of response.artifacts) {
                    if (artifact.path && artifact.content) {
                        await vfs.writeFile(artifact.path, artifact.content);
                    }
                }
            });
        }

        return response;
    });
}
