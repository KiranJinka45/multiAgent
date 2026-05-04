import { Job } from '@packages/utils';
export interface BuildJobData {
    prompt: string;
    userId: string;
    projectId: string;
    executionId: string;
    tenantId?: string;
    isFastPreview?: boolean;
}
export interface DeployJobData {
    projectId: string;
    executionId: string;
    previewUrl?: string;
    sandboxDir?: string;
}
export type BuildJob = Job<BuildJobData>;
export type DeployJob = Job<DeployJobData>;
export interface RedisOptions {
    port: number;
    [key: string]: unknown;
}
export interface RedisInstance {
    set(key: string, value: string, mode: string, duration: number, flag: string): Promise<string | null>;
    get(key: string): Promise<string | null>;
    hincrby(key: string, field: string, increment: number): Promise<number>;
    lpush(key: string, ...values: string[]): Promise<number>;
    ltrim(key: string, start: number, stop: number): Promise<string>;
    options: RedisOptions;
}
