/**
 * platform/shared/types.ts
 * 
 * Central type definitions for the Aion Production Platform.
 */

export type MissionStatus = 'planning' | 'generating' | 'validating' | 'completed' | 'failed' | 'aborted';
export type TaskStatus = 'waiting' | 'ready' | 'running' | 'completed' | 'failed' | 'aborted';

export interface BaseTask {
    id: string;
    type: string;
    title: string;
    description?: string;
    dependsOn?: string[];
    inputs?: string[];
    outputs?: string[];
    payload?: Record<string, unknown>;
    status?: TaskStatus;
    result?: Record<string, unknown>;
    branchId?: string;
    isWinner?: boolean;
    startTime?: number;
    lastUpdate?: number;
    retryCount?: number;
}

export interface Mission {
    id: string;
    userId: string;
    prompt: string;
    status: MissionStatus;
    createdAt: Date;
    updatedAt: Date;
    metadata: Record<string, unknown>;
    blueprint?: Record<string, unknown>;
}

export interface JobPayload {
    missionId: string;
    taskId: string;
    type: string;
    payload: Record<string, unknown>;
}
