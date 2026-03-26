import logger from '@libs/observability';

export interface GuardrailResult {
    isValid: boolean;
    violations: string[];
    sanitizedFiles: { path: string, content: string }[];
}

export class GuardrailService {
    private readonly PROTECTED_FILES = [
        'package.json',
        'tsconfig.json',
        'next.config.js',
        'next.config.mjs',
        'tailwind.config.js',
        'tailwind.config.ts',
        '.env',
        '.env.local'
    ];

    /**
     * Validates and sanitizes agent file outputs according to reliability rules.
     */
    validateOutput(files: { path: string, content: string }[], originalFiles: Record<string, string>): GuardrailResult {
        const violations: string[] = [];
        const sanitizedFiles: { path: string, content: string }[] = [];

        for (const file of files) {
            const fileName = file.path.split('/').pop() || '';
            const isProtected = this.PROTECTED_FILES.includes(fileName);

            if (isProtected) {
                const original = originalFiles[file.path];
                // For critical build files, we NEVER allow AI modification once initialized
                const isCriticalConfig = ['next.config.js', 'next.config.mjs', 'tsconfig.json', 'tailwind.config.js', 'tailwind.config.ts'].includes(fileName);

                if (isCriticalConfig && original && file.content !== original) {
                    violations.push(`CRITICAL: Unauthorized modification of build infrastructure: ${file.path}. This file is locked for stability.`);
                    logger.error({ path: file.path }, '[GuardrailService] BLOCK: AI attempted to modify locked config file');
                    sanitizedFiles.push({ path: file.path, content: original });
                    continue;
                }

                if (original && file.content !== original) {
                    violations.push(`Unauthorized modification of critical file: ${file.path}. AI is not permitted to modify project infrastructure.`);
                    logger.warn({ path: file.path }, '[GuardrailService] Guard: Reverted config modification');
                    sanitizedFiles.push({ path: file.path, content: original });
                    continue;
                }
            }

            // Append valid/sanitized file
            sanitizedFiles.push(file);
        }

        return {
            isValid: violations.length === 0,
            violations,
            sanitizedFiles
        };
    }

    private isDestructive(original: string, updated: string, fileName: string): boolean {
        if (fileName === 'package.json') {
            try {
                const oldPkg = JSON.parse(original);
                const newPkg = JSON.parse(updated);

                // Prevent removal of critical scripts
                const criticalScripts = ['dev', 'build', 'start'];
                for (const script of criticalScripts) {
                    if (oldPkg.scripts?.[script] && !newPkg.scripts?.[script]) return true;
                }

                // Prevent removal of base dependencies (templates usually need these)
                // This is a relaxed check; ideally we'd compare dependency count or specific keys
                return false; 
            } catch {
                return true; // Invalid JSON is destructive
            }
        }
        
        // For other files like tsconfig, any change might be risky but we allow non-structural changes for now.
        // A stricter rule would be to ONLY allow patches, never whole-file replacements.
        return false;
    }
}

export const guardrailService = new GuardrailService();
