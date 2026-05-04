import { Orchestrator } from '../api-gateway/services/orchestrator';
import { ArtifactValidator } from '../api-gateway/services/artifact-validator';
import { PreviewRegistry } from '../runtime/previewRegistry';
import { previewManager } from '../runtime/preview-manager';
import logger from '../config/logger';
import fs from 'fs-extra';
import path from 'path';

async function verifyPipeline() {
    const projectId = 'test-pipeline-stability-' + Date.now();
    const executionId = 'exec-' + projectId;
    const sandboxDir = path.join(process.cwd(), '.generated-projects', projectId);

    logger.info({ projectId }, '--- STARTING PIPELINE STABILITY VERIFICATION ---');

    try {
        // 1. Test Artifact Validator (Negative)
        logger.info('[Step 1] Verifying ArtifactValidator (Negative)...');
        const initialValidation = await ArtifactValidator.validate(projectId);
        if (initialValidation.valid) {
            throw new Error('Validation should have failed for non-existent project');
        }
        logger.info('ArtifactValidator correctly caught missing sandbox.');

        // 2. Setup Mock Sandbox
        logger.info('[Step 2] Setting up mock sandbox...');
        await fs.ensureDir(sandboxDir);
        await fs.writeFile(path.join(sandboxDir, 'package.json'), JSON.stringify({ name: 'test' }));
        await fs.ensureDir(path.join(sandboxDir, 'app'));
        await fs.writeFile(path.join(sandboxDir, 'app/page.tsx'), 'export default () => <div>Test</div>');
        await fs.writeFile(path.join(sandboxDir, 'tsconfig.json'), '{}');

        // 3. Test Artifact Validator (Positive)
        logger.info('[Step 3] Verifying ArtifactValidator (Positive)...');
        const finalValidation = await ArtifactValidator.validate(projectId);
        if (!finalValidation.valid) {
            throw new Error(`Validation failed despite files existing: ${finalValidation.missingFiles?.join(', ')}`);
        }
        logger.info('ArtifactValidator correctly verified files.');

        // 4. Test Preview Registration & Mapping
        logger.info('[Step 4] Testing Registry Mapping...');
        const reg = await PreviewRegistry.init(projectId, executionId);
        if (!reg.previewId || !reg.accessToken) {
            throw new Error('Registry failed to generate IDs');
        }
        const lookup = await PreviewRegistry.lookupByPreviewId(reg.previewId);
        if (lookup?.projectId !== projectId) {
            throw new Error('Reverse lookup failed');
        }
        logger.info('Registry mapping verified.');

        // 5. Cleanup
        await fs.remove(sandboxDir);
        await PreviewRegistry.delete(projectId);
        
        logger.info('--- VERIFICATION SUCCESSFUL ---');
        process.exit(0);

    } catch (error) {
        logger.error({ error: error instanceof Error ? error.message : String(error) }, '--- VERIFICATION FAILED ---');
        process.exit(1);
    }
}

verifyPipeline();

