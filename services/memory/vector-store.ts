import { supabaseAdmin } from '@queue/supabase-admin';
import logger from '@configs/logger';

export interface CodeChunkMetadata {
    purpose: string;
    tech_stack: string;
    filePath: string;
    projectId: string;
}

export class VectorStore {
    /**
     * Stores code chunks and their embeddings in the Supabase vector store.
     */
    static async upsertChunks(chunks: { content: string, embedding: number[], metadata: CodeChunkMetadata }[]) {
        if (chunks.length === 0) return;

        try {
            const payload = chunks.map(c => ({
                project_id: c.metadata.projectId,
                file_path: c.metadata.filePath,
                chunk_content: c.content,
                embedding: c.embedding,
                metadata: {
                    purpose: c.metadata.purpose,
                    tech_stack: c.metadata.tech_stack
                },
                created_at: new Date().toISOString()
            }));

            const { error } = await supabaseAdmin
                .from('project_code_embeddings')
                .upsert(payload);

            if (error) throw error;
            logger.info({ count: chunks.length }, '[VectorStore] Successfully indexed code chunks');
        } catch (error) {
            logger.error({ error }, '[VectorStore] Failed to index chunks');
        }
    }

    /**
     * Performs a semantic search for similar code chunks.
     */
    static async searchSimilarCode(queryEmbedding: number[], techStack?: string, limit = 5) {
        try {
            const { data, error } = await supabaseAdmin.rpc('match_code_chunks', {
                query_embedding: queryEmbedding,
                match_threshold: 0.5,
                match_count: limit,
                tech_stack_filter: techStack || null
            });

            if (error) throw error;
            return data || [];
        } catch (error) {
            logger.error({ error }, '[VectorStore] Semantic search failed');
            return [];
        }
    }
}
