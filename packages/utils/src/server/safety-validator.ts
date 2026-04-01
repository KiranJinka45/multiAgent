import logger from '@packages/observability';

export interface SafetyCheckResult {
    safe: boolean;
    reason?: string;
    blockedPatterns?: string[];
}

/**
 * SafetyValidator - Enterprise-grade guardrails for autonomous AI output.
 * 
 * Prevents prompt injection outcomes, dangerous shell commands,
 * and PII/credential leaking during the code generation cycle.
 */
export class SafetyValidator {
    private static DANGEROUS_PATTERNS = [
        /rm\s+-rf/i,           // Recursive deletion
        /chmod\s+777/i,         // Global write permissions
        /chown\s+root/i,        // Root ownership takeover
        /cat\s+\/etc\/passwd/i, // Credential extraction
        /curl\s+.*\.sh\s*\|\s*bash/i, // Remote script execution
        /eval\(/i,              // Arbitrary JS execution
        /process\.exit\(/i,    // System termination
        /child_process\.exec/i, // Shell breakout
    ];

    /**
     * Scans any string or object for unsafe patterns.
     */
    public static check(content: any): SafetyCheckResult {
        const text = typeof content === 'string' ? content : JSON.stringify(content);
        const blocked: string[] = [];

        for (const pattern of this.DANGEROUS_PATTERNS) {
            if (pattern.test(text)) {
                blocked.push(pattern.source);
            }
        }

        if (blocked.length > 0) {
            logger.error({ blockedPatterns: blocked }, '[SafetyValidator] BLOCKED dangerous pattern in agent output');
            return {
                safe: false,
                reason: 'Dangerous architectural or security pattern detected in generated code.',
                blockedPatterns: blocked
            };
        }

        return { safe: true };
    }
}
