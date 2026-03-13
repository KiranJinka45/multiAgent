import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import redis from '@queue/redis-client';
import logger from '@config/logger';
import { AgentContext } from '../types/agent-context';
import { OrchestratorLock } from '../config/orchestrator-lock';
import { VirtualFileSystem, VirtualFile } from './vfs/virtual-fs';

export interface ExecutionMetrics {
    startTime: string;
    endTime?: string;
    totalDurationMs?: number;
    tokensTotal?: number;
    promptTokensTotal?: number;
    completionTokensTotal?: number;
    costTotalInr?: number;
}

export interface AgentResult {
    agentName: string;
    status: 'pending' | 'in_progress' | 'completed' | 'failed';
    data?: unknown;
    error?: string;
    attempts: number;
    startTime: string;
    endTime?: string;
    tokens?: number;
    promptTokens?: number;
    completionTokens?: number;
    inputHash?: string;
    outputHash?: string;
    workerId?: string;
}

export interface JournalEntry {
    operationId: string;
    stageIndex: number;
    workerId: string;
    status: 'pending' | 'committed' | 'failed';
    inputHash: string;
    outputHash?: string;
    createdAt: string;
    updatedAt: string;
}

export interface CommitLogEntry {
    stageIndex: number;
    inputHash: string;
    outputHash?: string;
    workerId: string;
    startedAt: string;
    completedAt: string;
    durationMs: number;
    retryCount: number;
}

export interface RetryPolicy {
    retryCount: number;
    nextRetryAt?: string;
    lastError?: string;
}

export interface ExecutionContextType {
    executionId: string;
    userId: string;
    projectId: string;
    prompt: string;
    status: 'initializing' | 'executing' | 'validating' | 'completed' | 'failed';
    currentStageIndex: number;
    currentStage: string;
    version: number;
    paymentStatus: 'pending' | 'verified' | 'failed';
    agentResults: Record<string, AgentResult>;
    journals: Record<string, JournalEntry>;
    retryPolicies: Record<string, RetryPolicy>;
    metrics: ExecutionMetrics;
    metadata: Record<string, unknown>;
    correlationId: string;
    finalFiles?: VirtualFile[];
    locked?: boolean;
    lastCommitHash: string;
    vfsSnapshot?: [string, VirtualFile][];
}

export class DistributedExecutionContext implements ExecutionContextType, AgentContext {
    public executionId: string;
    private key: string;
    private vfs: VirtualFileSystem = new VirtualFileSystem();
    private static TTL = 86400; // 24 hours

    // Properties from ExecutionContextType
    public userId: string = '';
    public projectId: string = '';
    public prompt: string = '';
    public status: 'initializing' | 'executing' | 'validating' | 'completed' | 'failed' = 'initializing';
    public currentStageIndex: number = 0;
    public currentStage: string = '';
    public version: number = 0;
    public paymentStatus: 'pending' | 'verified' | 'failed' = 'pending';
    public agentResults: Record<string, AgentResult> = {};
    public journals: Record<string, JournalEntry> = {};
    public retryPolicies: Record<string, RetryPolicy> = {};
    public metrics: ExecutionMetrics = { startTime: new Date().toISOString() };
    public metadata: Record<string, unknown> = {};
    public correlationId: string = '';
    public lastCommitHash: string = '0'.repeat(64); // Seed hash
    public locked?: boolean;
    public finalFiles?: VirtualFile[];

    private static LUA_TRANSITION_SCRIPT = `
        local contextKey = KEYS[1]
        local lockKey = KEYS[2]
        local commitLogKey = KEYS[3]
        
        local expectedWorkerId = ARGV[1]
        local stageId = ARGV[2]
        local stageIndex = tonumber(ARGV[3])
        local status = ARGV[4]
        local message = ARGV[5]
        local inputHash = ARGV[6]
        local outputHash = ARGV[7]
        local expectedVersion = tonumber(ARGV[8])
        local timestamp = ARGV[9]
        local commitHash = ARGV[10]

        -- 1. Validate Lock Ownership
        local currentLockOwner = redis.call("get", lockKey)
        if currentLockOwner ~= expectedWorkerId then
            return {err = "LOCK_LOST", owner = currentLockOwner}
        end

        -- 2. Validate Context & Version
        local data = redis.call("get", contextKey)
        if not data then return {err = "CONTEXT_MISSING"} end

        local ctx = cjson.decode(data)
        
        -- Version Check (Optimistic Locking)
        if expectedVersion and ctx.version ~= expectedVersion then
            return {err = "VERSION_MISMATCH", current = ctx.version, expected = expectedVersion}
        end

        -- Monotonicity Check
        if stageIndex < ctx.currentStageIndex then
            return {err = "BACKWARD_TRANSITION", current = ctx.currentStageIndex}
        end

        -- 3. Update State
        if not ctx.agentResults then ctx.agentResults = {} end
        local stage = ctx.agentResults[stageId] or {attempts = 0}
        
        stage.agentName = stageId
        stage.status = status
        stage.workerId = expectedWorkerId
        
        if status == "in_progress" then
           stage.startTime = stage.startTime or timestamp
           stage.inputHash = inputHash
           stage.attempts = stage.attempts + 1
        elseif status == "completed" then
           stage.endTime = timestamp
           stage.outputHash = outputHash
           
           -- Append to Commit Log
           local duration = 0
           if stage.startTime then
              -- Simplified duration calc since Lua doesn't have native ISO parser
              -- In production we'd pass numeric timestamps
              duration = 0 
           end
           
           local logEntry = {
              stageIndex = stageIndex,
              inputHash = stage.inputHash,
              outputHash = outputHash,
              commitHash = commitHash,
              workerId = expectedWorkerId,
              startedAt = stage.startTime or timestamp,
              completedAt = timestamp,
              durationMs = duration,
              retryCount = stage.attempts - 1
           }
           redis.call("RPUSH", commitLogKey, cjson.encode(logEntry))
           ctx.lastCommitHash = commitHash
        end

        ctx.agentResults[stageId] = stage
        ctx.currentStage = stageId
        ctx.currentStageIndex = stageIndex
        ctx.version = ctx.version + 1
        ctx.currentMessage = message
        ctx.status = "executing"

        -- 4. Persist
        redis.call("setex", contextKey, 86400, cjson.encode(ctx))
        return {ok = "SUCCESS", version = ctx.version}
    `;

    constructor(executionId?: string) {
        this.executionId = executionId || uuidv4();
        this.key = `execution:${this.executionId}`;
    }

    getVFS() {
        return this.vfs;
    }

    getExecutionId() {
        return this.executionId;
    }

    getProjectId() {
        return this.projectId;
    }

    async init(userId: string, projectId: string, prompt: string, correlationId: string, planType: string = 'free'): Promise<ExecutionContextType> {
        this.userId = userId;
        this.projectId = projectId;
        this.prompt = prompt;
        this.correlationId = correlationId;
        this.status = 'initializing';
        this.currentStageIndex = 0;
        this.currentStage = 'start';
        this.paymentStatus = 'pending';
        this.agentResults = {};
        this.metrics = {
            startTime: new Date().toISOString(),
            promptTokensTotal: 0,
            completionTokensTotal: 0,
            tokensTotal: 0
        };
        this.metadata = { planType };

        const context: ExecutionContextType = {
            executionId: this.executionId,
            userId,
            projectId,
            prompt,
            correlationId,
            status: this.status,
            currentStageIndex: this.currentStageIndex,
            currentStage: this.currentStage,
            paymentStatus: 'pending',
            agentResults: {},
            journals: {},
            retryPolicies: {},
            version: 0,
            metrics: {
                startTime: new Date().toISOString(),
                promptTokensTotal: 0,
                completionTokensTotal: 0,
                tokensTotal: 0
            },
            metadata: { planType },
            lastCommitHash: '0'.repeat(64),
            vfsSnapshot: this.vfs.createSnapshot()
        };

        await redis.setex(this.key, DistributedExecutionContext.TTL, JSON.stringify(context));
        await redis.sadd('active:executions', this.executionId);
        return context;
    }

    public static async getActiveExecutions(): Promise<string[]> {
        return await redis.smembers('active:executions');
    }

    async get(): Promise<ExecutionContextType | null> {
        const data = await redis.get(this.key);
        return data ? JSON.parse(data) : null;
    }

    /**
     * Pulls the latest state from Redis and hydrates the local VFS.
     */
    async sync(): Promise<ExecutionContextType | null> {
        const data = await this.get();
        if (data) {
            // Hydrate properties (ignoring private ones)
            if (data.userId) this.userId = data.userId;
            if (data.projectId) this.projectId = data.projectId;
            if (data.prompt) this.prompt = data.prompt;
            if (data.status) this.status = data.status;
            if (data.currentStageIndex) this.currentStageIndex = data.currentStageIndex;
            if (data.currentStage) this.currentStage = data.currentStage;
            if (data.version) this.version = data.version;
            if (data.agentResults) this.agentResults = data.agentResults;
            if (data.metadata) this.metadata = data.metadata;
            if (data.vfsSnapshot) {
                this.vfs.restoreSnapshot(data.vfsSnapshot);
            }
        }
        return data;
    }

    async update(updates: Partial<ExecutionContextType>): Promise<void> {
        const current = await this.get();
        if (!current) throw new Error(`Execution context ${this.executionId} not found`);

        const updated = { ...current, ...updates };
        await redis.setex(this.key, DistributedExecutionContext.TTL, JSON.stringify(updated));
    }

    async updateStage(stageId: string): Promise<void> {
        await this.atomicUpdate((ctx) => {
            ctx.currentStage = stageId;
        });
    }

    async atomicTransition(
        lock: OrchestratorLock,
        stageId: string,
        stageIndex: number,
        status: 'in_progress' | 'completed' | 'failed',
        message: string,
        inputHash?: string,
        outputHash?: string
    ): Promise<number> {
        const currentVersion = (await this.get())?.version || 0;
        const commitLogKey = `commitLog:${this.executionId}`;

        const result = await redis.eval(
            DistributedExecutionContext.LUA_TRANSITION_SCRIPT,
            3,
            this.key,
            lock.getLockKey(),
            commitLogKey,
            lock.getWorkerId(),
            stageId,
            stageIndex.toString(),
            status,
            message,
            inputHash || '',
            outputHash || '',
            currentVersion.toString(),
            new Date().toISOString(),
            status == 'completed' ? DistributedExecutionContext.computeChainedHash(
                (await this.get())?.lastCommitHash || '0'.repeat(64),
                { stageId, inputHash, outputHash, stageIndex }
            ) : ''
        ) as any;

        if (result.err) {
            if (result.err === 'LOCK_LOST') {
                throw new Error(`LOCK_LOST: Worker ${lock.getWorkerId()} no longer owns execution ${this.executionId}. Current owner: ${result.owner}`);
            }
            if (result.err === 'VERSION_MISMATCH') {
                throw new Error(`VERSION_MISMATCH: Stale transition attempt. Current version: ${result.current}, Expected: ${result.expected}`);
            }
            throw new Error(`TRANSITION_FAILED: ${result.err}`);
        }

        return result.version;
    }

    /**
     * WRITE-AHEAD JOURNALING
     */
    async writeJournal(
        stageIndex: number,
        operationId: string,
        status: 'pending' | 'committed' | 'failed',
        lock: OrchestratorLock,
        inputHash: string,
        outputHash?: string,
        expectedVersion?: number
    ): Promise<void> {
        await this.atomicUpdate((ctx) => {
            if (expectedVersion !== undefined && ctx.version !== expectedVersion) {
                throw new Error(`VERSION_MISMATCH: Stale journal write. Current: ${ctx.version}, Expected: ${expectedVersion}`);
            }

            const entry: JournalEntry = {
                operationId,
                stageIndex,
                workerId: lock.getWorkerId(),
                status,
                inputHash,
                outputHash,
                createdAt: ctx.journals[operationId]?.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            ctx.journals[operationId] = entry;
            ctx.version += 1;
        });
    }

    async getJournal(operationId: string): Promise<JournalEntry | null> {
        const ctx = await this.get();
        return ctx?.journals[operationId] || null;
    }

    async getCommitLog(): Promise<CommitLogEntry[]> {
        const logs = await redis.lrange(`commitLog:${this.executionId}`, 0, -1);
        return logs.map(l => JSON.parse(l));
    }

    public static computeHash(input: string | Record<string, unknown> | unknown[]): string {
        const str = typeof input === 'string' ? input : JSON.stringify(input);
        return crypto.createHash('sha256').update(str).digest('hex');
    }

    public static computeChainedHash(previousHash: string, data: Record<string, unknown>): string {
        const dataStr = JSON.stringify(data);
        return crypto.createHash('sha256').update(previousHash + dataStr).digest('hex');
    }

    async performOnce(key: string, fn: () => Promise<unknown>): Promise<unknown> {
        const lockKey = `once:${this.executionId}:${key}`;
        const acquired = await redis.set(lockKey, 'locked', 'EX', 3600, 'NX');
        if (acquired === 'OK') {
            try {
                return await fn();
            } catch (err) {
                await redis.del(lockKey); // Allow retry if it failed
                throw err;
            }
        }
        logger.info({ executionId: this.executionId, key }, 'Skipped performOnce block - already executed');
        return null;
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

    async finalize(status: 'completed' | 'failed', expectedVersion?: number): Promise<void> {
        await this.atomicUpdate((ctx) => {
            if (expectedVersion !== undefined && ctx.version !== expectedVersion) {
                throw new Error(`VERSION_MISMATCH: Stale finalize. Current: ${ctx.version}, Expected: ${expectedVersion}`);
            }
            ctx.status = status;
            ctx.locked = true;
            ctx.metrics.endTime = new Date().toISOString();
            ctx.metrics.totalDurationMs =
                new Date().getTime() - new Date(ctx.metrics.startTime).getTime();
            ctx.version += 1;
        });
        await redis.srem('active:executions', this.executionId);
    }

    /**
     * DEAD LETTER RECORDING
     */
    async recordToDeadLetter(reason: string, metadata: Record<string, unknown> = {}): Promise<void> {
        const ctx = await this.get();
        if (!ctx) return;

        const dlqEntry = {
            ...ctx,
            deadLetteredAt: new Date().toISOString(),
            reason,
            extraMetadata: metadata
        };

        const dlqKey = `dlq:execution:${this.executionId}`;
        await redis.setex(dlqKey, 604800, JSON.stringify(dlqEntry)); // 7 days retention
        await redis.sadd('dlq:executions', this.executionId);
        await redis.srem('active:executions', this.executionId);

        logger.error({ executionId: this.executionId, reason }, 'Execution moved to Dead Letter Queue');
    }

    /**
     * Atomic update using Redis WATCH/MULTI/EXEC for safe concurrency
     */
    public async atomicUpdate(updater: (ctx: ExecutionContextType) => void): Promise<void> {
        for (let i = 0; i < 5; i++) { // Max retries for optimistic locking
            try {
                await redis.watch(this.key);
                const data = await redis.get(this.key);
                if (!data) throw new Error(`Execution context ${this.executionId} not found`);

                const context = JSON.parse(data) as ExecutionContextType;
                if (context.locked) {
                    await redis.unwatch();
                    return; // Fail-safe: No updates allowed on locked context
                }
                if (context.vfsSnapshot && this.vfs.isEmpty()) {
                    this.vfs.restoreSnapshot(context.vfsSnapshot);
                }
                
                updater(context);
                
                // Keep snapshot in sync after updater runs
                context.vfsSnapshot = this.vfs.createSnapshot();

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
