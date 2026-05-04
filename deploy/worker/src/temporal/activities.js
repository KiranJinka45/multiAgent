"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.architectActivity = architectActivity;
exports.generatorActivity = generatorActivity;
exports.buildActivity = buildActivity;
exports.deployActivity = deployActivity;
const utils_1 = require("@packages/utils");
const observability_1 = require("@packages/observability");
const sandbox_runner_1 = require("../sandbox-runner");
// Note: In a real implementation, we would import the actual agent logic here.
// For this SaaS transition, we are wrapping the existing logic into activities.
async function architectActivity(input) {
    const { executionId, projectId } = input;
    observability_1.logger.info({ executionId, projectId }, '[Activity] Starting Architect');
    await utils_1.eventBus.stage(executionId, 'architecture', 'in_progress', 'Designing system architecture...', 20, projectId);
    // Implementation logic would go here (or call existing service)
    // simulate work
    await new Promise(resolve => setTimeout(resolve, 2000));
    await utils_1.eventBus.stage(executionId, 'architecture', 'completed', 'Architecture designed.', 40, projectId);
}
async function generatorActivity(input) {
    const { executionId, projectId } = input;
    observability_1.logger.info({ executionId, projectId }, '[Activity] Starting Generator');
    await utils_1.eventBus.stage(executionId, 'generator', 'in_progress', 'Generating source code...', 40, projectId);
    // Implementation logic would go here
    await new Promise(resolve => setTimeout(resolve, 3000));
    await utils_1.eventBus.stage(executionId, 'generator', 'completed', 'Code generation complete.', 60, projectId);
}
async function buildActivity(input) {
    const { executionId, projectId } = input;
    observability_1.logger.info({ executionId, projectId }, '[Activity] Starting Build');
    await utils_1.eventBus.stage(executionId, 'build', 'in_progress', 'Building project in sandbox...', 60, projectId);
    const runner = new sandbox_runner_1.SandboxRunner(executionId);
    const startTime = Date.now();
    // In a real scenario, we'd trigger the actual build command
    // For now, we simulate a successful build
    await new Promise(resolve => setTimeout(resolve, 5000));
    const duration = Date.now() - startTime;
    await utils_1.eventBus.stage(executionId, 'build', 'completed', 'Build successful.', 80, projectId);
    return {
        success: true,
        artifacts: ['dist/index.js'],
        duration
    };
}
async function deployActivity(input) {
    const { executionId, projectId } = input;
    observability_1.logger.info({ executionId, projectId }, '[Activity] Starting Deployment');
    await utils_1.eventBus.stage(executionId, 'deploy', 'in_progress', 'Deploying to staging...', 80, projectId);
    // Implementation logic would go here
    const previewUrl = `https://preview-${projectId}.multiagent.app`;
    await new Promise(resolve => setTimeout(resolve, 2000));
    await utils_1.eventBus.stage(executionId, 'deploy', 'completed', 'Deployment successful.', 100, projectId);
    return {
        success: true,
        previewUrl
    };
}
//# sourceMappingURL=activities.js.map