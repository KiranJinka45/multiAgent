import fs from 'fs-extra';
import path from 'path';
import logger from '@config/logger';

export interface ValidationResult {
    valid: boolean;
    missingFiles: string[];
    error?: string;
}

export class ArtifactValidator {
    private static REQUIRED_FILES = [
        'package.json',
        'app/page.tsx', // Specific to the Next.js templates being used
        'tsconfig.json'
    ];

    /**
     * Validates that all critical artifacts exist in the sandbox directory.
     * @param projectId The project ID to validate
     * @returns A ValidationResult object
     */
    static async validate(projectId: string): Promise<ValidationResult> {
        const sandboxDir = path.join(process.cwd(), '.generated-projects', projectId);
        const missingFiles: string[] = [];

        try {
            if (!(await fs.pathExists(sandboxDir))) {
                return { valid: false, missingFiles: [], error: 'Sandbox directory does not exist' };
            }

            for (const file of this.REQUIRED_FILES) {
                const filePath = path.join(sandboxDir, file);
                if (!(await fs.pathExists(filePath))) {
                    missingFiles.push(file);
                }
            }

            if (missingFiles.length > 0) {
                logger.error({ projectId, missingFiles }, '[ArtifactValidator] Critical artifacts missing');
                return { valid: false, missingFiles };
            }

            logger.info({ projectId }, '[ArtifactValidator] All critical artifacts verified.');
            return { valid: true, missingFiles: [] };

        } catch (error) {
            const msg = error instanceof Error ? error.message : String(error);
            logger.error({ projectId, error: msg }, '[ArtifactValidator] Validation crashed');
            return { valid: false, missingFiles: [], error: msg };
        }
    }
}
