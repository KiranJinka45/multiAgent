"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const artifact_validator_1 = require("../api-gateway/services/artifact-validator");
const previewRegistry_1 = require("../runtime/previewRegistry");
const logger_1 = __importDefault(require("../config/logger"));
const fs_extra_1 = __importDefault(require("fs-extra"));
const path_1 = __importDefault(require("path"));
async function verifyPipeline() {
    const projectId = 'test-pipeline-stability-' + Date.now();
    const executionId = 'exec-' + projectId;
    const sandboxDir = path_1.default.join(process.cwd(), '.generated-projects', projectId);
    logger_1.default.info({ projectId }, '--- STARTING PIPELINE STABILITY VERIFICATION ---');
    try {
        // 1. Test Artifact Validator (Negative)
        logger_1.default.info('[Step 1] Verifying ArtifactValidator (Negative)...');
        const initialValidation = await artifact_validator_1.ArtifactValidator.validate(projectId);
        if (initialValidation.valid) {
            throw new Error('Validation should have failed for non-existent project');
        }
        logger_1.default.info('ArtifactValidator correctly caught missing sandbox.');
        // 2. Setup Mock Sandbox
        logger_1.default.info('[Step 2] Setting up mock sandbox...');
        await fs_extra_1.default.ensureDir(sandboxDir);
        await fs_extra_1.default.writeFile(path_1.default.join(sandboxDir, 'package.json'), JSON.stringify({ name: 'test' }));
        await fs_extra_1.default.ensureDir(path_1.default.join(sandboxDir, 'app'));
        await fs_extra_1.default.writeFile(path_1.default.join(sandboxDir, 'app/page.tsx'), 'export default () => <div>Test</div>');
        await fs_extra_1.default.writeFile(path_1.default.join(sandboxDir, 'tsconfig.json'), '{}');
        // 3. Test Artifact Validator (Positive)
        logger_1.default.info('[Step 3] Verifying ArtifactValidator (Positive)...');
        const finalValidation = await artifact_validator_1.ArtifactValidator.validate(projectId);
        if (!finalValidation.valid) {
            throw new Error(`Validation failed despite files existing: ${finalValidation.missingFiles?.join(', ')}`);
        }
        logger_1.default.info('ArtifactValidator correctly verified files.');
        // 4. Test Preview Registration & Mapping
        logger_1.default.info('[Step 4] Testing Registry Mapping...');
        const reg = await previewRegistry_1.PreviewRegistry.init(projectId, executionId);
        if (!reg.previewId || !reg.accessToken) {
            throw new Error('Registry failed to generate IDs');
        }
        const lookup = await previewRegistry_1.PreviewRegistry.lookupByPreviewId(reg.previewId);
        if (lookup?.projectId !== projectId) {
            throw new Error('Reverse lookup failed');
        }
        logger_1.default.info('Registry mapping verified.');
        // 5. Cleanup
        await fs_extra_1.default.remove(sandboxDir);
        await previewRegistry_1.PreviewRegistry.delete(projectId);
        logger_1.default.info('--- VERIFICATION SUCCESSFUL ---');
        process.exit(0);
    }
    catch (error) {
        logger_1.default.error({ error: error instanceof Error ? error.message : String(error) }, '--- VERIFICATION FAILED ---');
        process.exit(1);
    }
}
verifyPipeline();
//# sourceMappingURL=verify-pipeline-stability.js.map