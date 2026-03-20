import fs from 'fs-extra';
import path from 'path';
import logger from '@libs/utils';

export interface ValidationResult {
    valid: boolean;
    missingFiles: string[];
    error?: string;
}

export class ArtifactValidator {
    private static WEB_REQUIRED = ['package.json', 'app/page.tsx', 'tsconfig.json'];
    private static API_REQUIRED = ['package.json', 'src/main.ts'];
    private static LEGACY_REQUIRED = ['package.json', 'app/page.tsx', 'tsconfig.json'];

    /**
     * Validates that all critical artifacts exist in the sandbox directory.
     */
    static async validate(projectId: string): Promise<ValidationResult> {
        const sandboxDir = path.join(process.cwd(), '.generated-projects', projectId);
        const missingFiles: string[] = [];

        try {
            if (!(await fs.pathExists(sandboxDir))) {
                return { valid: false, missingFiles: [], error: 'Sandbox directory does not exist' };
            }

            const hasWeb = await fs.pathExists(path.join(sandboxDir, 'apps/web'));
            const hasApi = await fs.pathExists(path.join(sandboxDir, 'apps/api'));

            if (hasWeb || hasApi) {
                // Modular Monolith Structure
                if (hasWeb) {
                    for (const f of this.WEB_REQUIRED) {
                        if (!(await fs.pathExists(path.join(sandboxDir, 'apps/web', f)))) {
                            missingFiles.push(`apps/web/${f}`);
                        }
                    }
                }
                if (hasApi) {
                    // Try src/main.ts (NestJS) or src/index.ts (Express)
                    const apiEntry = await fs.pathExists(path.join(sandboxDir, 'apps/api/src/main.ts')) 
                        ? 'src/main.ts' 
                        : (await fs.pathExists(path.join(sandboxDir, 'apps/api/src/index.ts')) ? 'src/index.ts' : 'src/main.ts' );
                    
                    const apiRequired = ['package.json', apiEntry];
                    for (const f of apiRequired) {
                        if (!(await fs.pathExists(path.join(sandboxDir, 'apps/api', f)))) {
                            missingFiles.push(`apps/api/${f}`);
                        }
                    }
                }
            } else {
                // Legacy Flat Structure
                for (const f of this.LEGACY_REQUIRED) {
                    if (!(await fs.pathExists(path.join(sandboxDir, f)))) {
                        missingFiles.push(f);
                    }
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
