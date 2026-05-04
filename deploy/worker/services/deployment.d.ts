/**
 * Deployment Service: Handles building Docker images and deploying to Kubernetes.
 */
export declare class DeploymentService {
    private projectPath;
    private projectId;
    constructor(projectPath: string, projectId: string);
    buildImage(): Promise<string>;
    deployPreview(): Promise<string>;
    promoteToProduction(): Promise<{
        success: boolean;
        url: string;
    }>;
}
