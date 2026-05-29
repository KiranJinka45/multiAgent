import * as path from 'path';

export class NamespaceEscapeDetector {
    private static BANNED_PATTERNS = [
        /\bnsenter\b/,
        /\bunshare\b/,
        /\bmount\b.*--bind\b/,
        /\bmount\b.*\/host\b/,
        /\bchroot\b.*\/host\b/,
        /\bchroot\b.*\s\/(\s|$)/
    ];

    private static ALLOWED_BASE_DIR = '/var/lib/ztan';

    /**
     * Inspects a command payload for namespace breakout signatures.
     * Returns true if a breakout attempt is detected.
     */
    static detectCommandEscapeAttempt(command: string): boolean {
        return this.BANNED_PATTERNS.some(pattern => pattern.test(command));
    }

    /**
     * Inspects a filesystem host path mapping.
     * Returns true if path is unsafe (outside /var/lib/ztan).
     */
    static detectPathEscapeAttempt(hostPath: string): boolean {
        const resolved = path.resolve(hostPath);
        const normalized = resolved.replace(/\\/g, '/');
        const allowedBase = this.ALLOWED_BASE_DIR;
        const pathCheck = normalized.replace(/^[a-zA-Z]:/, '');
        return !pathCheck.startsWith(allowedBase);
    }
}
