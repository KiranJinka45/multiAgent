import redis from '@queue/redis-client';
import logger from '@configs/logger';

export interface CycleRecord {
    cycle: number;
    timestamp: string;
    phase: 'plan' | 'code' | 'build' | 'debug' | 'evaluate';
    success: boolean;
    details: string;
    metadata?: Record<string, unknown>;
}

export interface AgentThought {
    agent: string;
    timestamp: string;
    action: string;
    reasoning: string;
}

export interface MemorySnapshot {
    executionId: string;
    cycles: CycleRecord[];
    failedPatches: string[];       // Descriptions of patches that didn't work
    agentThoughts: AgentThought[];
    codeSnapshots: Record<number, string[]>; // cycle → list of file paths
    evaluationScores: number[];    // overallScore per cycle
    totalTokensUsed: number;
}

/**
 * AgentMemory — Redis-backed persistent context store for autonomous execution.
 *
 * Stores task history, failed patches, agent reasoning chains, and code snapshots
 * across retry cycles. Enables agents to "remember" previous failures and avoid
 * repeating mistakes.
 *
 * Keyed by executionId with a 24h TTL (same as DistributedExecutionContext).
 */
export class AgentMemory {
    private static TTL = 86400; // 24 hours
    private key: string;
    public executionId: string;

    private constructor(executionId: string) {
        this.executionId = executionId;
        this.key = `execution:${executionId}:memory`;
    }

    /**
     * Create or hydrate an AgentMemory instance for the given execution.
     */
    static async create(executionId: string): Promise<AgentMemory> {
        const memory = new AgentMemory(executionId);
        const exists = await redis.exists(memory.key);

        if (!exists) {
            const initial: MemorySnapshot = {
                executionId,
                cycles: [],
                failedPatches: [],
                agentThoughts: [],
                codeSnapshots: {},
                evaluationScores: [],
                totalTokensUsed: 0
            };
            await redis.setex(memory.key, AgentMemory.TTL, JSON.stringify(initial));
            logger.info({ executionId }, '[AgentMemory] Initialized new memory store');
        }

        return memory;
    }

    /**
     * Get the full memory snapshot.
     */
    async get(): Promise<MemorySnapshot> {
        const raw = await redis.get(this.key);
        if (!raw) {
            return {
                executionId: this.executionId,
                cycles: [],
                failedPatches: [],
                agentThoughts: [],
                codeSnapshots: {},
                evaluationScores: [],
                totalTokensUsed: 0
            };
        }
        return JSON.parse(raw);
    }

    /**
     * Record the outcome of one autonomous cycle.
     */
    async recordCycle(
        cycle: number,
        phase: CycleRecord['phase'],
        success: boolean,
        details: string,
        metadata?: Record<string, unknown>
    ): Promise<void> {
        await this.atomicUpdate(snapshot => {
            snapshot.cycles.push({
                cycle,
                timestamp: new Date().toISOString(),
                phase,
                success,
                details,
                metadata
            });
        });
    }

    /**
     * Record a failed patch attempt so DebugAgent can avoid it next time.
     */
    async recordFailedPatch(description: string): Promise<void> {
        await this.atomicUpdate(snapshot => {
            snapshot.failedPatches.push(description);
            // Keep only last 20 to avoid context bloat
            if (snapshot.failedPatches.length > 20) {
                snapshot.failedPatches = snapshot.failedPatches.slice(-20);
            }
        });
    }

    /**
     * Record an agent's thought/reasoning step.
     */
    async recordThought(agent: string, action: string, reasoning: string): Promise<void> {
        await this.atomicUpdate(snapshot => {
            snapshot.agentThoughts.push({
                agent,
                timestamp: new Date().toISOString(),
                action,
                reasoning
            });
            // Keep last 50 thoughts
            if (snapshot.agentThoughts.length > 50) {
                snapshot.agentThoughts = snapshot.agentThoughts.slice(-50);
            }
        });
    }

    /**
     * Store a code snapshot for a given cycle (just file paths, not content).
     */
    async recordCodeSnapshot(cycle: number, filePaths: string[]): Promise<void> {
        await this.atomicUpdate(snapshot => {
            snapshot.codeSnapshots[cycle] = filePaths;
        });
    }

    /**
     * Record evaluation score for a cycle.
     */
    async recordEvaluationScore(score: number): Promise<void> {
        await this.atomicUpdate(snapshot => {
            snapshot.evaluationScores.push(score);
        });
    }

    /**
     * Add to the total token usage counter.
     */
    async addTokenUsage(tokens: number): Promise<void> {
        await this.atomicUpdate(snapshot => {
            snapshot.totalTokensUsed += tokens;
        });
    }

    /**
     * Get the list of previous failure descriptions for DebugAgent context.
     */
    async getFailureHistory(): Promise<string[]> {
        const snapshot = await this.get();
        return snapshot.failedPatches;
    }

    /**
     * Get all agent thoughts for SSE streaming to frontend.
     */
    async getThoughts(): Promise<AgentThought[]> {
        const snapshot = await this.get();
        return snapshot.agentThoughts;
    }

    /**
     * Get the current cycle count.
     */
    async getCycleCount(): Promise<number> {
        const snapshot = await this.get();
        return snapshot.cycles.length;
    }

    /**
     * Atomic read-modify-write on the memory snapshot.
     */
    private async atomicUpdate(mutator: (snapshot: MemorySnapshot) => void): Promise<void> {
        try {
            const snapshot = await this.get();
            mutator(snapshot);
            await redis.setex(this.key, AgentMemory.TTL, JSON.stringify(snapshot));
        } catch (e) {
            logger.error({ error: e, executionId: this.executionId }, '[AgentMemory] atomicUpdate failed');
        }
    }
}
