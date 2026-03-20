/**
 * packages/contracts/task.ts
 * 
 * Core interfaces for the DAG-based task orchestration system.
 */

export type TaskType = "frontend" | "backend" | "database" | "security" | "monetization" | "deployment" | "monitoring";

export enum StageState {
    IDLE = 'IDLE',
    RUNNING = 'RUNNING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED'
}

export interface Task {
    id: string;
    type: TaskType;
    dependencies: string[];
    payload: any;
    status: "pending" | "running" | "completed" | "failed";
    result?: any;
    error?: string;
}

export interface TaskGraph {
    tasks: Task[];
}
