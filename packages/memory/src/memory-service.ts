import { supabaseAdmin } from '@packages/utils';
import { logger } from '@packages/observability';

export interface MemoryEntry {
    type: 'error' | 'fix' | 'pattern' | 'project';
    content: string;
    metadata?: unknown;
    projectId?: string;
}

export class MemoryService {
    private static SIMILARITY_THRESHOLD = 0.9; // Higher for cosine

    private static async getEmbedding(text: string): Promise<number[]> {
        logger.debug({ length: text.length }, '[MemoryService] Generating mock embedding');
        return new Array(1536).fill(0).map(() => Math.random());
    }

    static async store(entry: MemoryEntry, tenantId: string) {
        logger.info({ type: entry.type, tenantId }, '[MemoryService] Storing semantic memory');
        
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

        if (error) {
            logger.error({ error: error.message }, '[MemoryService] Failed to store memory');
            throw new Error(`Database Error: ${error.message}`);
        }
        return data;
    }

    static async retrieve(query: string, tenantId: string, limit: number = 5) {
        logger.info({ query, tenantId }, '[MemoryService] Retrieving memories with semantic filter');
        
        const embedding = await this.getEmbedding(query);
        
        // 🧠 Semantic Search using pgvector
        const { data, error } = await supabaseAdmin.rpc('match_semantic_memories', {
            query_embedding: embedding,
            match_threshold: this.SIMILARITY_THRESHOLD,
            match_count: limit,
            p_tenant_id: tenantId
        });

        if (error) {
            logger.error({ error: error.message }, '[MemoryService] Failed to retrieve semantic memories');
            // Fallback to simple matching if RPC fails (simplified for mock)
            return [];
        }
        
        return data;
    }

    static async getRecentFixes(errorPattern: string, tenantId: string) {
        return await this.retrieve(errorPattern, tenantId, 3);
    }
}



