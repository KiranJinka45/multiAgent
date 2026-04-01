import { JobArtifact } from '@packages/contracts';
import { missionController, logger, eventBus } from '@packages/utils/server';

const FORBIDDEN_PATTERNS = [
    'rm -rf',
    'process.exit',
    'fs.unlink',
    'child_process.exec',
    'eval(',
    '/etc/passwd',
    '.env'
];

const MAX_PATCH_LENGTH = 5000;

/**
 * Principal-Level Security Guardrail for AI-Generated Patches
 * Prevents destructive commands and large hallucinations.
 */
export function validatePatchOrThrow(patch: JobArtifact): void {
    if (!patch || !patch.content) {
        throw new Error('Invalid patch: Missing content');
    }

    // 1. Size Guardrail (Hallucination detection)
    if (patch.content.length > MAX_PATCH_LENGTH) {
        logger.warn({ path: patch.path, size: patch.content.length }, '[SelfHealer] Patch rejected: Too large');
        throw new Error(`Patch too large (${patch.content.length} chars) - possible AI hallucination`);
    }

    // 2. Security Patterns Guardrail
    for (const pattern of FORBIDDEN_PATTERNS) {
        if (patch.content.includes(pattern)) {
            logger.error({ path: patch.path, pattern }, '[SelfHealer] Security violation detected');
            throw new Error(`Unsafe patch detected: Contains forbidden pattern "${pattern}"`);
        }
    }

    logger.info({ path: patch.path }, '[SelfHealer] Patch security check passed');
}

/**
 * Normalizes varied agent error formats into a standard string for comparison.
 */
export function normalizeError(error: unknown): string {
    if (!error) return 'unknown_error';
    if (typeof error === 'string') return error.toLowerCase();
    if (error instanceof Error) return error.message.toLowerCase();
    return JSON.stringify(error).toLowerCase();
}

export class EvolutionManager {
    static MAX_EVOLUTION_ATTEMPTS = 2;

    /**
     * Conducts autonomous post-mortem and repairs codebases.
     */
    static async evolve(missionId: string, error: string, files: { path: string, content: string }[]): Promise<boolean> {
        try {
            const mission = await missionController.getMission(missionId);
            if (!mission) return false;

            const evoCount = (mission.metadata?.evolutionCount || 0) as number;
            if (evoCount >= this.MAX_EVOLUTION_ATTEMPTS) {
                logger.info({ missionId }, '[EvolutionManager] Max evolution attempts reached. Halting.');
                return false;
            }

            logger.warn({ missionId, attempt: evoCount + 1 }, '[EvolutionManager] Commencing autonomous self-evolution');

            // --- UI TRANSLUCENCY ---
            await eventBus.stage(missionId, 'repairing', 'executing', `System crashed. Initiating autonomous post-mortem (Attempt ${evoCount + 1})...`, 50, mission.projectId);
            await eventBus.thought(missionId, 'AutoHealer', `Analyzing failure context: ${error}`, mission.projectId);

            // 1. Invoke RepairAgent from @packages/brain
            const { RepairAgent } = await import('@packages/brain');
            const repairAgent = new RepairAgent();

            const response = await repairAgent.execute(
                { error, files: files.slice(0, 10) }, // Focus on most relevant files
                { 
                    projectId: mission.projectId, 
                    executionId: mission.id,
                    userId: mission.userId,
                    vfs: null,
                    history: [],
                    metadata: mission.metadata,
                    getExecutionId: () => mission.id,
                    getProjectId: () => mission.projectId,
                    getVFS: () => null,
                    get: async () => ({}),
                    atomicUpdate: async () => {}
                }
            );

            const data = response.data as { patches?: { path: string, content: string }[] } | undefined;

            if (response.success && data?.patches && data.patches.length > 0) {
                // 2. Validate and Apply patches
                for (const patch of data.patches) {
                    validatePatchOrThrow({ path: patch.path, content: patch.content, type: 'patch' });
                    await missionController.applyEvolutionPatch(missionId, patch);
                }

                // 3. Update count and re-queue
                await missionController.updateMission(missionId, {
                    metadata: { evolutionCount: evoCount + 1 }
                });

                await eventBus.stage(missionId, 'repairing', 'completed', 'Surgical patch generated. Applied to sandbox and restarting build...', 60, mission.projectId);

                await missionController.requeueExecution(missionId, `Self-evolution patch applied (Attempt ${evoCount + 1})`);
                return true;
            }

            logger.error({ missionId, error: response.error }, '[EvolutionManager] Generative repair failed to produce patches');
            await eventBus.thought(missionId, 'AutoHealer', 'Generative repair failed. Patch requirements were too complex or unsafe.', mission.projectId);
            return false;

        } catch (e) {
            logger.error({ missionId, error: (e as Error).message }, '[EvolutionManager] Evolution process crashed');
            return false;
        }
    }
}
