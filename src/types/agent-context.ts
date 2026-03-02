export interface AgentContext {
    getExecutionId(): string;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    get(): Promise<any>;
    setAgentResult(
        agentName: string,
        result: {
            status: 'in_progress' | 'completed' | 'failed';
            data?: unknown;
            tokens?: number;
            startTime?: string;
            endTime?: string;
        }
    ): Promise<void>;
}
