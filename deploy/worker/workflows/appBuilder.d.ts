/**
 * Temporal Workflow: Orchestrates the build -> preview -> prod pipeline.
 */
export declare function buildWorkflow(projectId: string): Promise<{
    status: string;
    previewUrl: any;
    logs: any;
}>;
