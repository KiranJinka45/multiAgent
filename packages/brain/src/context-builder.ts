import { MemoryService } from '../memory/memory-service';
import logger from '@libs/utils';

export interface BrainContext {
    prompt: string;
    memories: any[];
    systemState: string;
    timestamp: string;
}

export class ContextBuilder {
    static async build(prompt: string, tenantId: string): Promise<BrainContext> {
        logger.info({ prompt, tenantId }, '[ContextBuilder] Building context for reasoning');
        
        // 1. Retrieve relevant past experiences for THIS tenant
        const memories = await MemoryService.retrieve(prompt, tenantId);

        return {
            prompt,
            memories,
            systemState: 'healthy',
            timestamp: new Date().toISOString()
        };
    }
}
