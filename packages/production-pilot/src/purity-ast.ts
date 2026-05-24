export interface ASTCheckResult {
    passed: boolean;
    violations: string[];
}

export class PurityASTScanner {
    private static FORBIDDEN_IDENTIFIERS = new Set([
        'Math', 'Date', 'Promise', 'setTimeout', 'setInterval', 'fetch', 'axios', 'XMLHttpRequest', 'globalThis', 'global', 'window', 'process', 'localStorage', 'sessionStorage'
    ]);

    /**
     * Syntactically scans the reducer code, tracing identifiers, alias assignments, 
     * and computed brackets to prevent dynamic purity bypasses.
     */
    public static scan(reducer: Function): ASTCheckResult {
        const source = reducer.toString();
        const violations: string[] = [];

        // 1. Scan for forbidden literal keyword tokens
        if (source.includes('new Function') || source.includes('eval(')) {
            violations.push('Dynamic code evaluation (eval / new Function)');
        }

        // 2. Simple tokenizer for scope/identifier tracing
        const tokens = this.tokenize(source);
        const aliases = new Map<string, string>(); // variable -> original forbidden symbol

        for (let i = 0; i < tokens.length; i++) {
            const token = tokens[i];

            // Trace simple assignments (e.g., const r = Math)
            if ((token === 'const' || token === 'let' || token === 'var') && i + 3 < tokens.length) {
                const varName = tokens[i + 1];
                const op = tokens[i + 2];
                const value = tokens[i + 3];
                if (op === '=' && this.FORBIDDEN_IDENTIFIERS.has(value)) {
                    aliases.set(varName, value);
                    violations.push(`Identifier Aliasing: "${varName}" assigned to forbidden "${value}"`);
                }
            }

            // Catch direct usage of forbidden identifiers
            if (this.FORBIDDEN_IDENTIFIERS.has(token)) {
                // If it's variable declaration, skip checking it as a violation
                const prev = i > 0 ? tokens[i - 1] : '';
                if (prev !== 'const' && prev !== 'let' && prev !== 'var') {
                    let violationName = token;
                    if (token === 'Math' && tokens[i + 1] === 'random') {
                        violationName = 'Math.random';
                    } else if (token === 'Date' && tokens[i + 1] === 'now') {
                        violationName = 'Date.now';
                    }
                    violations.push(`Forbidden Symbol Reference: "${violationName}"`);
                    if (violationName !== token) {
                        violations.push(violationName);
                    }
                }
            }

            // Catch aliased function invocations (e.g., r())
            if (aliases.has(token) && i + 1 < tokens.length && tokens[i + 1] === '(') {
                violations.push(`Aliased Forbidden Call: "${token}()" (alias of "${aliases.get(token)}")`);
            }

            // Catch computed brackets on forbidden objects (e.g., globalThis["Math"])
            if (token === '[' && i > 0 && i + 1 < tokens.length) {
                const prevObj = tokens[i - 1];
                const key = tokens[i + 1].replace(/['"]/g, ''); // strip quotes
                if (this.FORBIDDEN_IDENTIFIERS.has(prevObj) || aliases.has(prevObj)) {
                    if (this.FORBIDDEN_IDENTIFIERS.has(key)) {
                        violations.push(`Computed Property Bypass: "${prevObj}['${key}']"`);
                    }
                }
            }
        }

        return {
            passed: violations.length === 0,
            violations
        };
    }

    private static tokenize(code: string): string[] {
        // Regex splitting by whitespace, operators, and grouping symbols
        const regex = /\s+|([{}()\[\],;=]|['"].*?['"]|[a-zA-Z_$][a-zA-Z0-9_$]*)/g;
        const matches = code.match(regex) || [];
        return matches.map(m => m.trim()).filter(m => m.length > 0);
    }
}
