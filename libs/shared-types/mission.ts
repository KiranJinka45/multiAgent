export type MissionStatus = 
    | 'init' 
    | 'queued' 
    | 'planning' 
    | 'graph_ready' 
    | 'executing' 
    | 'building' 
    | 'repairing' 
    | 'assembling' 
    | 'deploying' 
    | 'previewing' 
    | 'complete' 
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
