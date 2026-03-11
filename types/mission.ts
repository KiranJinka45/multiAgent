export type MissionStatus = 'queued' | 'starting' | 'planning' | 'generating' | 'previewing' | 'completed' | 'failed';

export interface Mission {
    id: string; // This corresponds to the executionId
    projectId: string;
    userId: string;
    prompt: string;
    status: MissionStatus;
    createdAt: number;
    updatedAt: number;
    metadata: {
        currentStage?: string;
        progress?: number;
        error?: string;
        previewUrl?: string;
        [key: string]: any;
    };
}

export interface MissionUpdate {
    status?: MissionStatus;
    metadata?: Partial<Mission['metadata']>;
}
