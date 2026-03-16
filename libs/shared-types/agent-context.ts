export interface AgentContext {
    getExecutionId(): string;
    getProjectId(): string;
    getVFS?(): any;
    getPlanningResult?(): any;
    [key: string]: any;
}
