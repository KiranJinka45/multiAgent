import pLimit from "p-limit";
import { Task } from "@shared-types/task";
import { agentRegistry } from "@services/agent-registry";
import logger from "@config/logger";
import { DistributedExecutionContext } from "@context/execution-context";

const limit = pLimit(3); // parallel control

export async function executeTasks(tasks: Task[]) {
  const results = new Map<string, Promise<unknown>>();

  async function run(task: Task) {
    // Wait for dependencies to finish
    for (const depId of task.dependencies) {
      const depPromise = results.get(depId);
      if (depPromise) {
        await depPromise;
      } else {
        throw new Error(`Dependency ${depId} for task ${task.id} not found or not scheduled.`);
      }
    }

    // Execute the task with concurrency limit
    const resultPromise = limit(() => runAgent(task));
    results.set(task.id, resultPromise);
    return resultPromise;
  }

  await Promise.all(tasks.map(t => run(t)));
  
  // Resolve all promises to get final results
  const finalResults = new Map<string, unknown>();
  for (const [id, promise] of results.entries()) {
      finalResults.set(id, await promise);
  }
  
  return finalResults;
}

async function runAgent(task: Task) {
    logger.info({ taskId: task.id, type: task.type }, `[Executor] Running agent for task ${task.type}`);
    
    const agentNameMap: Record<string, string> = {
        "frontend": "FrontendAgent",
        "backend": "BackendAgent",
        "database": "DatabaseAgent",
        "security": "SecurityAgent",
        "monetization": "SaaSMonetizationAgent",
        "deployment": "DeploymentAgent",
        "monitoring": "MonitoringAgent",
        "sandbox-editor": "SandboxEditorAgent"
    };

    const agentName = agentNameMap[task.type];
    const agent = agentRegistry.getAgent(agentName);
    
    if (!agent) {
        throw new Error(`Agent ${agentName} not found for task type ${task.type}`);
    }

    const response = await agent.execute(task.payload);
    if (!response.success) {
        throw new Error(`Agent ${agentName} failed: ${response.error}`);
    }

    // --- ARTIFACT PERSISTENCE ---
    if (response.artifacts && response.artifacts.length > 0) {
        const context = task.payload.context as DistributedExecutionContext;
        if (context && typeof context.atomicUpdate === 'function') {
            await context.atomicUpdate(() => {
                const vfs = context.getVFS();
                for (const artifact of response.artifacts) {
                    if (artifact.path && artifact.content) {
                        vfs.writeFile(artifact.path, artifact.content);
                        logger.debug({ taskId: task.id, path: artifact.path }, `[Executor] Persisted artifact to VFS`);
                    }
                }
            });
        }
    }

    return response.data;
}
