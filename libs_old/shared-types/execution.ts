export interface ExecutionResult<T = any> {
    success: boolean;
    data?: T;
    error?: string;
    tokens?: number;
    metrics?: {
        durationMs: number;
        startTime: string;
        endTime: string;
    };
}

export interface ExecutionStep {
    id: string;
    name: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    startTime?: string;
    endTime?: string;
    error?: string;
}
