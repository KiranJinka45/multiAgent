import { v4 as uuidv4 } from 'uuid';
import redis from './redis';
import logger from './logger';

export interface ExecutionMetrics {
    startTime: string;
    endTime?: string;
    totalDurationMs?: number;
    tokensTotal?: number;
    costTotalInr?: number;
}

export interface AgentResult {
    agentName: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    data?: any;
    error?: string;
    attempts: number;
    startTime: string;
    endTime?: string;
    tokens?: number;
}

export interface ExecutionContextType {
    executionId: string;
    userId: string;
    projectId: string;
    prompt: string;
    status: 'initializing' | 'executing' | 'validating' | 'completed' | 'failed';
    currentStage: string;
    paymentStatus: 'pending' | 'verified' | 'failed';
    agentResults: Record<string, AgentResult>;
    metrics: ExecutionMetrics;
    metadata: Record<string, any>;
    correlationId: string;
}

export class DistributedExecutionContext {
    private executionId: string;
    private key: string;
    private static TTL = 86400; // 24 hours

    constructor(executionId?: string) {
        this.executionId = executionId || uuidv4();
        this.key = `execution:${this.executionId}`;
    }

    getExecutionId() {
        return this.executionId;
    }

    async init(userId: string, projectId: string, prompt: string, correlationId: string): Promise<ExecutionContextType> {
        const context: ExecutionContextType = {
            executionId: this.executionId,
            userId,
            projectId,
            prompt,
            correlationId,
            status: 'initializing',
            currentStage: 'start',
            paymentStatus: 'pending',
            agentResults: {},
            metrics: {
                startTime: new Date().toISOString(),
            },
            metadata: {},
        };

        await redis.setex(this.key, DistributedExecutionContext.TTL, JSON.stringify(context));
        return context;
    }

    async get(): Promise<ExecutionContextType | null> {
        const data = await redis.get(this.key);
        return data ? JSON.parse(data) : null;
    }

    async update(updates: Partial<ExecutionContextType>): Promise<void> {
        const current = await this.get();
        if (!current) throw new Error(`Execution context ${this.executionId} not found`);

        const updated = { ...current, ...updates };
        await redis.setex(this.key, DistributedExecutionContext.TTL, JSON.stringify(updated));
    }

    async updateStage(stage: string): Promise<void> {
        await this.atomicUpdate((ctx) => {
            ctx.currentStage = stage;
            ctx.status = 'executing';
        });
    }

    async setAgentResult(agentName: string, result: Partial<AgentResult>): Promise<void> {
        await this.atomicUpdate((ctx) => {
            const existing = ctx.agentResults[agentName] || {
                agentName,
                status: 'pending',
                attempts: 0,
                startTime: new Date().toISOString(),
            };

            ctx.agentResults[agentName] = {
                ...existing,
                ...result,
                endTime: result.status === 'completed' || result.status === 'failed' ? new Date().toISOString() : undefined,
            };
        });
    }

    async finalize(status: 'completed' | 'failed'): Promise<void> {
        await this.atomicUpdate((ctx) => {
            ctx.status = status;
            ctx.metrics.endTime = new Date().toISOString();
            ctx.metrics.totalDurationMs =
                new Date().getTime() - new Date(ctx.metrics.startTime).getTime();
        });
    }

    /**
     * Atomic update using Redis WATCH/MULTI/EXEC for safe concurrency
     */
    private async atomicUpdate(updater: (ctx: ExecutionContextType) => void): Promise<void> {
        for (let i = 0; i < 5; i++) { // Max retries for optimistic locking
            try {
                await redis.watch(this.key);
                const data = await redis.get(this.key);
                if (!data) throw new Error(`Execution context ${this.executionId} not found`);

                const context = JSON.parse(data) as ExecutionContextType;
                updater(context);

                const result = await redis.multi()
                    .setex(this.key, DistributedExecutionContext.TTL, JSON.stringify(context))
                    .exec();

                if (result) return; // Success
                logger.warn({ executionId: this.executionId, attempt: i }, 'Concurrency conflict on context update, retrying...');
            } catch (err) {
                await redis.unwatch();
                throw err;
            }
        }
        throw new Error(`Failed to update execution context ${this.executionId} after multiple attempts due to concurrency.`);
    }
}
