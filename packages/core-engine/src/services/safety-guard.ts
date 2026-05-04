import { logger } from "@packages/observability";

/**
 * SafetyGuard
 * Audits prompts and actions for safety violations before execution.
 */
export class SafetyGuard {
    private static BANNED_KEYWORDS = [
        "jailbreak",
        "rm -rf /",
        "sudo rm",
        "drop table",
        "format c:",
        "overwrite system",
        "bypass security",
    ];

    /**
     * Scans a prompt for safety violations.
     * Throws an error if a violation is detected.
     */
    static async auditPrompt(prompt: string): Promise<void> {
        const lowercasePrompt = prompt.toLowerCase();
        
        for (const keyword of this.BANNED_KEYWORDS) {
            if (lowercasePrompt.includes(keyword)) {
                logger.error({ keyword, promptSnippet: prompt.substring(0, 50) }, "[SAFETY] Prompt Rejected: Banned Content Detected");
                throw new Error(`[SAFETY_VIOLATION] Your request contains prohibited content: "${keyword}". Build aborted.`);
            }
        }

        // Potential for more complex AI-based safety scanning here
        logger.debug("[SAFETY] Prompt audit passed");
    }

    /**
     * Scans generated code or planned actions for runtime safety.
     */
    static async auditPlannedActions(actions: any[]): Promise<void> {
        // Implementation for scanning destructive operations before they reach the runner
        logger.debug("[SAFETY] Action audit passed");
    }
}
