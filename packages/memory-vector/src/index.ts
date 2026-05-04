import { supabaseAdmin, logger } from '@packages/utils';
import { MemoryEntry, IMemoryService } from '@packages/memory-core';

export class MemoryVectorService implements IMemoryService {
    private static SIMILARITY_THRESHOLD = 0.9;

    private async getEmbedding(text: string): Promise<number[]> {
        logger.debug({ length: text.length }, '[MemoryVectorService] Generating mock embedding');
        return new Array(1536).fill(0).map(() => Math.random());
    }

    async store(entry: MemoryEntry, tenantId: string) {
        const embedding = await this.getEmbedding(entry.content);
        const { data, error } = await supabaseAdmin
            .from('semantic_memories')
            .insert({
                tenant_id: tenantId,
                project_id: entry.projectId,
                type: entry.type,
                content: entry.content,
                embedding,
                metadata: entry.metadata || {}
            });

        if (error) throw new Error(`Database Error: ${error.message}`);
        return data;
    }

    async retrieve(query: string, tenantId: string, limit: number = 5) {
        const embedding = await this.getEmbedding(query);
        const { data, error } = await supabaseAdmin.rpc('match_semantic_memories', {
            query_embedding: embedding,
            match_threshold: MemoryVectorService.SIMILARITY_THRESHOLD,
            match_count: limit,
            p_tenant_id: tenantId
        });
        if (error) return [];
        return data;
    }

    async getRecentFixes(errorPattern: string, tenantId: string) {
        return await this.retrieve(errorPattern, tenantId, 3);
    }
}

export const memoryVector = new MemoryVectorService();
export { MemoryVectorService as VectorStore };
export default memoryVector;



