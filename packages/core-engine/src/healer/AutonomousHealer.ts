import { HealerAgent } from '@packages/agents';
import { SandboxExecutionResult } from '@packages/sandbox';
import { logger } from '@packages/observability';

/**
 * 🩹 AutonomousHealer
 * Closed-loop system that traps runtime errors and dispatches repair agents.
 * Connects sandbox execution results directly to the corrective logic.
 */
export class AutonomousHealer {
    constructor(private healerAgent: HealerAgent) {}

    /**
     * Analyzes a sandbox execution result and initiates repair if needed.
     */
    async processExecution(
        result: SandboxExecutionResult, 
        files: Record<string, string>
    ): Promise<{ success: boolean, logs: string[], patches?: any[] }> {
        if (result.exitCode === 0) {
            return { success: true, logs: ['Execution succeeded'] };
        }

        logger.warn({ executionId: result.executionId }, '[Healer] Trap-and-Correct loop initiated');

        const errorLog = result.stderr || result.stdout;
        const logs: string[] = [`Detected failure (exit code ${result.exitCode})`, `Error: ${errorLog.substring(0, 200)}...`];

        try {
            // 🛡️ REPAIR LOOP (Iterative)
            let currentFiles = { ...files };
            let attempts = 0;
            const maxAttempts = 3;

            while (attempts < maxAttempts) {
                attempts++;
                logger.info({ attempts, executionId: result.executionId }, '[Healer] Attempting autonomous repair');
                
                const repairResult = await this.healerAgent.repair(result.executionId, errorLog, currentFiles);
                
                if (repairResult.confidenceScore > 0.8) {
                    logs.push(`Healer proposed ${repairResult.patches.length} patches with ${repairResult.confidenceScore * 100}% confidence.`);
                    
                    // In a real system, we would apply patches to the VFS and re-run execution here
                    // For this implementation, we return the proposed patches
                    return {
                        success: false, // Still marked as failed until re-execution pass
                        logs,
                        patches: repairResult.patches
                    };
                } else {
                    logs.push(`Healer confidence too low (${(repairResult.confidenceScore * 100).toFixed(0)}%). Aborting.`);
                    break;
                }
            }
        } catch (err: any) {
            logger.error({ err: err.message }, '[Healer] Repair loop crashed');
            logs.push(`Critical error in healer engine: ${err.message}`);
        }

        return { success: false, logs };
    }
}
