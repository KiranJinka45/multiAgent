export interface AdvisoryTelemetry {
    suspicionScore: number; // 0.0 to 1.0 (heuristic)
    matchedTags: string[];
    isAdvisoryOnly: boolean;
}

export class CommandSemanticParser {
    private static RULE_MAPPINGS: Array<{ pattern: RegExp; tag: string; weight: number }> = [
        { pattern: /\b(cat|less|head|tail|grep)\b/, tag: 'read-file', weight: 0.2 },
        { pattern: /(\b(tee|cp|mv)\b|>>|>)/, tag: 'write-file', weight: 0.4 },
        { pattern: /\b(rm|unlink)\b/, tag: 'delete-file', weight: 0.6 },
        { pattern: /\b(curl|wget|nc|ping)\b/, tag: 'socket-connect', weight: 0.7 },
        { pattern: /\b(listen|bind)\b/, tag: 'socket-listen', weight: 0.8 },
        { pattern: /\b(nslookup|dig|host)\b/, tag: 'dns-resolve', weight: 0.3 },
        { pattern: /\b(sh|bash|cmd|powershell)\b/, tag: 'exec-command', weight: 0.9 },
        { pattern: /\bmount\b/, tag: 'mount-filesystem', weight: 1.0 },
        { pattern: /\breboot\b/, tag: 'reboot-system', weight: 1.0 },
        { pattern: /\b(chroot|unshare|nsenter)\b/, tag: 'namespace-manipulation', weight: 1.0 }
    ];

    /**
     * Parses a raw command string to provide advisory telemetry.
     * WARNING: This is a lexical heuristic only. It is vulnerable to obfuscation
     * (e.g. base64, variable indirection, IFS manipulation).
     * DO NOT USE FOR CONTAINMENT OR SECURITY ENFORCEMENT.
     */
    static analyzeCommandAdvisory(payload: string): AdvisoryTelemetry {
        const matches = new Set<string>();
        let score = 0;
        
        for (const rule of this.RULE_MAPPINGS) {
            if (rule.pattern.test(payload)) {
                matches.add(rule.tag);
                score = Math.max(score, rule.weight);
            }
        }

        // Extremely naive check for obfuscation indicators
        if (payload.includes('base64') || payload.includes('${') || payload.includes('\\')) {
            matches.add('obfuscation-indicator');
            score = Math.max(score, 0.8);
        }

        if (matches.size === 0) {
            matches.add('spawn-process');
            score = 0.5; // Unknown payload is moderately suspicious
        }

        return {
            suspicionScore: score,
            matchedTags: Array.from(matches),
            isAdvisoryOnly: true // Explicit architectural flag
        };
    }

    /**
     * Parses a command string into mapped semantic tags.
     */
    static parseCommand(payload: string): string[] {
        return this.analyzeCommandAdvisory(payload).matchedTags;
    }
}

