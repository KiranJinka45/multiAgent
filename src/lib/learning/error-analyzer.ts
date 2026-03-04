import logger from '../logger';

export interface BuildError {
    type: 'dependency' | 'syntax' | 'type' | 'runtime' | 'unknown';
    message: string;
    file?: string;
    line?: number;
    severity: 'error' | 'warning';
}

export class ErrorAnalyzer {
    /**
     * Parses standard build output (TSC/Next.js) into structured BuildError objects.
     */
    static analyze(stderr: string): BuildError[] {
        const errors: BuildError[] = [];

        // Naive line-by-line parsing for common patterns
        const lines = stderr.split('\n');
        for (const line of lines) {
            // TypeScript error pattern: path/to/file.ts(line,col): error TSXXXX: message
            const tsMatch = line.match(/(.+)\((\d+),(\d+)\): error TS\d+: (.+)/);
            if (tsMatch) {
                errors.push({
                    type: 'type',
                    file: tsMatch[1],
                    line: parseInt(tsMatch[2]),
                    message: tsMatch[4],
                    severity: 'error'
                });
                continue;
            }

            // Dependency error pattern: Module not found: Error: Can't resolve 'X'
            if (line.includes("Module not found") || line.includes("Can't resolve")) {
                errors.push({
                    type: 'dependency',
                    message: line.trim(),
                    severity: 'error'
                });
                continue;
            }

            // Syntax error pattern
            if (line.toLowerCase().includes("syntaxerror") || line.includes("Unexpected token")) {
                errors.push({
                    type: 'syntax',
                    message: line.trim(),
                    severity: 'error'
                });
            }
        }

        if (errors.length === 0 && stderr.trim().length > 0) {
            errors.push({
                type: 'unknown',
                message: stderr.trim().slice(0, 500),
                severity: 'error'
            });
        }

        return errors;
    }
}
