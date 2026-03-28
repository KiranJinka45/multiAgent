import { DeploymentService } from '@packages/services/deployment';
import path from 'path';

/**
 * Temporal Workflow: Orchestrates the build -> preview -> prod pipeline.
 */
export async function buildWorkflow(projectId: string) {
    const projectPath = path.join(process.cwd(), '.generated-projects', projectId);
    const deployment = new DeploymentService(projectPath, projectId);

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
