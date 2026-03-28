/**
 * LogAnalysisEngine
 * 
 * Specialized utility to parse build logs and extract:
 * 1. Stack traces
 * 2. File paths and line numbers
 * 3. Specific error codes (TS2322, etc.)
 */
interface ErrorInfo {
    type: string;
    file: string;
    line: string;
    message: string;
}

export class LogAnalysisEngine {
    private static ERROR_PATTERNS = [
        { name: 'typescript', regex: /(.+)\((\d+),(\d+)\): error (TS\d+): (.+)/g },
        { name: 'node_module', regex: /Error: Cannot find module '(.+)'/g },
        { name: 'syntax', regex: /SyntaxError: (.+)/g },
        { name: 'reference', regex: /ReferenceError: (.+) is not defined/g }
    ];

    static parse(logs: string): { errors: ErrorInfo[], summary: string } {
        const errors: ErrorInfo[] = [];
        
        for (const pattern of this.ERROR_PATTERNS) {
            let match;
            while ((match = pattern.regex.exec(logs)) !== null) {
                errors.push({
                    type: pattern.name,
                    file: match[1],
                    line: match[2],
                    message: match[5] || match[1]
                });
            }
        }

        const summary = errors.length > 0 
            ? `Found ${errors.length} specific errors in build logs.` 
            : "No specific error patterns matched in logs.";

        return { errors, summary };
    }
}
