import logger from '@config/logger';

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
                // RULE 1: Prevent full overwrite of core config files
                const original = originalFiles[file.path];
                if (original && file.content !== original) {
                    // Check if it's a "destructive" change (e.g., deleting scripts)
                    if (this.isDestructive(original, file.content, fileName)) {
                        violations.push(`Destructive modification of protected file: ${file.path}`);
                        logger.warn({ path: file.path }, '[GuardrailService] Blocked destructive modification');
                        // Sanitization: Revert to original or keep safe parts
                        sanitizedFiles.push({ path: file.path, content: original });
                        continue;
                    }
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
