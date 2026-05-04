"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildWorkflow = buildWorkflow;
const deployment_1 = require("@packages/services/deployment");
const path_1 = __importDefault(require("path"));
/**
 * Temporal Workflow: Orchestrates the build -> preview -> prod pipeline.
 */
async function buildWorkflow(projectId) {
    const projectPath = path_1.default.join(process.cwd(), '.generated-projects', projectId);
    const deployment = new deployment_1.DeploymentService(projectPath, projectId);
    // 1. Run Build
    const buildLogs = await deployment.buildImage();
    // 2. Deploy Preview
    const previewUrl = await deployment.deployPreview();
    // 3. Return results for UI
    return {
        status: 'preview_active',
        previewUrl,
        logs: buildLogs.slice(-1000) // Last 1000 chars of logs
    };
}
//# sourceMappingURL=appBuilder.js.map