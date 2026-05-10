
/**
 * 🛡️ ZTAN Safety Validator
 * Detects dangerous patterns in code and terminal commands.
 */
export class SafetyValidator {
    private static DANGEROUS_PATTERNS = [
        // Shell Injection
        /rm\s+-rf/i,
        /chmod\s+777/i,
        /chown\s+/i,
        /mkfs\s+/i,
        /dd\s+if=/i,
        
        // Credential Extraction
        /\/etc\/passwd/i,
        /\/etc\/shadow/i,
        /\.aws\/credentials/i,
        /\.ssh\//i,
        
        // Dangerous Node.js modules/functions
        /child_process/i,
        /eval\(/i,
        /new\s+Function\(/i,
        /process\.env/i,
        
        // SQL Injection (Basic)
        /DROP\s+TABLE/i,
        /DELETE\s+FROM/i
    ];

    /**
     * Checks if a string contains any dangerous patterns.
     * @param content The content to check.
     * @returns Object with safety status and matched pattern if any.
     */
    static check(content: string): { safe: boolean; pattern?: string } {
        for (const pattern of this.DANGEROUS_PATTERNS) {
            if (pattern.test(content)) {
                return { safe: false, pattern: pattern.source };
            }
        }
        return { safe: true };
    }
}
