export type MissionStatus = 
    | 'init' 
    | 'queued' 
    | 'planning' 
    | 'generating'
    | 'validating'
    | 'deploying' 
    | 'ready'
    | 'failed';

export interface Mission {
    id: string;
    projectId: string;
    userId: string;
    prompt: string;
    status: MissionStatus;
    createdAt: number;
    updatedAt: number;
    metadata: Record<string, unknown>;
    blueprint?: any;
}

export type MissionUpdate = Partial<Mission>;
