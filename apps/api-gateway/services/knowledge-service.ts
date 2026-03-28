import { VectorStore } from './memory/vector-store';
import { EmbeddingsEngine } from './memory/embeddings-engine';
import { memoryPlane } from './memory-plane';
import { logger } from '@packages/utils/server';

export interface KnowledgeContext {
    type: 'code_snippet' | 'documentation' | 'best_practice';
    content: string;
    relevance: number;
    metadata: Record<string, unknown>;
}

export class KnowledgeService {
    /**
     * Retrieves relevant context for a given prompt using semantic search.
     */
    static async getContext(prompt: string, techStack?: string, limit = 3): Promise<KnowledgeContext[]> {
        try {
            logger.info({ prompt, techStack }, '[KnowledgeService] Fetching contextual intelligence...');

            // 1. Generate embedding for the query
            const embedding = await EmbeddingsEngine.generate(prompt);
            if (!embedding) {
                logger.warn('[KnowledgeService] Failed to generate embedding. Proceeding without context.');
                return [];
            }

            // 2. Search Vector Store
            const results = await VectorStore.searchSimilarCode(embedding, techStack, limit);

            // 3. Map to unified context format
            return (results as Array<{ chunk_content: string; similarity?: number; metadata: Record<string, unknown> }>).map(r => ({
                type: 'code_snippet',
                content: r.chunk_content,
                relevance: r.similarity || 0,
                metadata: r.metadata
            }));

        } catch (error) {
            logger.error({ error }, '[KnowledgeService] Context retrieval failed');
            return [];
        }
    }

    /**
     * Augments a prompt with retrieved context from MemoryPlane (Layer 11).
     */
    static async augmentPrompt(basePrompt: string, projectId?: string): Promise<string> {
        if (!projectId) {
            const context = await this.getContext(basePrompt);
            if (context.length === 0) return basePrompt;
            const contextString = context
                .map(c => `[Context: ${c.metadata.purpose}]\n${c.content}`)
                .join('\n\n---\n\n');
            return `System Context:\n\n${contextString}\n\nMission: ${basePrompt}`;
        }

        try {
            const multiDimContext = await memoryPlane.getRelevantContext(projectId, basePrompt);
            return `
MISSION RECALL & ARCHITECTURAL GUIDANCE:
${multiDimContext}

BASED ON THE ABOVE MEMORY, PROCEED WITH THE MISSION:
${basePrompt}
            `.trim();
        } catch (error) {
            logger.error({ error }, '[KnowledgeService] Failed to augment prompt with MemoryPlane');
            return basePrompt;
        }
    }
}
