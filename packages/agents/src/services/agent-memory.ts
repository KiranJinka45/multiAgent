import redis from '@libs/utils';
import logger from '@libs/utils';

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

    async set(key: string, value: any) {
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
    static async set(missionId: string, key: string, value: any) {
        const fullKey = `memory:${missionId}:${key}`;
        await (redis as any).setex(fullKey, this.TTL, JSON.stringify(value));
        logger.debug({ missionId, key }, '[Memory] Value stored');
    }

    /**
     * Retrieve a value from mission memory.
     */
    static async get<T>(missionId: string, key: string): Promise<T | null> {
        const fullKey = `memory:${missionId}:${key}`;
        const data = await (redis as any).get(fullKey);
        if (!data) return null;
        try {
            return JSON.parse(data) as T;
        } catch (e) {
            return data as any;
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
        await (redis as any).rpush(key, entry);
        await (redis as any).expire(key, this.TTL);
    }
}
