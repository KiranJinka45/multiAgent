import { redis } from '@libs/shared-services';
import { logger } from '@libs/observability';
import { Redis } from 'ioredis';

/**
 * AgentMemory
 * 
 * Provides persistent memory for agents:
 * 1. Thread context (session history)
 * 2. Shared variables across agents
 * 3. Cache for expensive LLM results
 */
export class AgentMemory {
    private static instances = new Map<string, AgentMemory>();
    private missionId: string;

    constructor(missionId: string) {
        this.missionId = missionId;
    }

    /**
     * Factory method for mission-specific memory instance.
     */
    static async create(missionId: string): Promise<AgentMemory> {
        if (!this.instances.has(missionId)) {
            this.instances.set(missionId, new AgentMemory(missionId));
        }
        return this.instances.get(missionId)!;
    }

    async set(key: string, value: unknown) {
        return AgentMemory.set(this.missionId, key, value);
    }

    async get<T>(key: string): Promise<T | null> {
        return AgentMemory.get<T>(this.missionId, key);
    }

    async appendTranscript(agentName: string, message: string) {
        return AgentMemory.appendTranscript(this.missionId, agentName, message);
    }

    private static TTL = 3600 * 24; // 24 hours

    /**
     * Store a key-value pair in mission memory.
     */
    static async set(missionId: string, key: string, value: unknown) {
        const fullKey = `memory:${missionId}:${key}`;
        await (redis as unknown as Redis).set(fullKey, JSON.stringify(value), 'EX', this.TTL);
        logger.debug({ missionId, key }, '[Memory] Value stored');
    }

    /**
     * Retrieve a value from mission memory.
     */
    static async get<T>(missionId: string, key: string): Promise<T | null> {
        const fullKey = `memory:${missionId}:${key}`;
        const data = await (redis as unknown as Redis).get(fullKey);
        if (!data) return null;
        try {
            return JSON.parse(data) as T;
        } catch (e) {
            return data as unknown as T;
        }
    }

    /**
     * Persist agent thought/state for UI and debugging.
     */
    static async appendTranscript(missionId: string, agentName: string, message: string) {
        const key = `transcript:${missionId}`;
        const entry = JSON.stringify({
            timestamp: Date.now(),
            agent: agentName,
            message
        });
        await (redis as unknown as Redis).rpush(key, entry);
        await (redis as unknown as Redis).expire(key, this.TTL);
    }
}
