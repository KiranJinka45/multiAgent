export class CommandDepthAuditor {
    /**
     * Calculates the operational execution command depth of a given command line.
     * Command operators like ;, &&, ||, and | separate distinct execution steps.
     */
    public static calculateDepth(commandLine: string): number {
        const trimmed = commandLine.trim();
        if (trimmed.length === 0) {
            return 0;
        }

        // Standard command separators and pipelines
        const _operators = [';', '&&', '||', '|'];
        
        let depth = 1;
        let inQuotes = false;
        let quoteChar = '';

        for (let i = 0; i < trimmed.length; i++) {
            const char = trimmed[i];

            // Handle string literal boundaries to avoid parsing operators inside quotes
            if ((char === '"' || char === "'") && (i === 0 || trimmed[i - 1] !== '\\')) {
                if (inQuotes && char === quoteChar) {
                    inQuotes = false;
                    quoteChar = '';
                } else if (!inQuotes) {
                    inQuotes = true;
                    quoteChar = char;
                }
            }

            if (!inQuotes) {
                // Look for multi-char operators (&&, ||)
                if (char === '&' && trimmed[i + 1] === '&') {
                    depth++;
                    i++; // skip next char
                } else if (char === '|' && trimmed[i + 1] === '|') {
                    depth++;
                    i++; // skip next char
                } else if (char === ';') {
                    // Avoid counting trailing semicolons as new commands
                    const remainder = trimmed.slice(i + 1).trim();
                    if (remainder.length > 0) {
                        depth++;
                    }
                } else if (char === '|' && trimmed[i + 1] !== '|') {
                    // Single pipe operator
                    depth++;
                }
            }
        }

        return depth;
    }

    /**
     * Enforces the maximum command depth limit of 2 for safety.
     */
    public static isCompliant(commandLine: string, maxAllowedDepth = 2): boolean {
        return this.calculateDepth(commandLine) <= maxAllowedDepth;
    }
}
