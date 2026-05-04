import { projectMemory } from './project-memory';
import { VectorStore } from './memory/vector-store';
import { EmbeddingsEngine } from './memory/embeddings-engine';
import { logger } from '@packages/observability';

export interface ExperienceLesson {
    action: string;
    outcome: 'success' | 'failure';
    lesson: string;
    context: Record<string, unknown>;
}

/**
 * MemoryPlane (Layer 11)
 * 
 * The central intelligence layer for long-term recall. 
 * Orchestrates semantic code search, architectural graph traversal, 
 * and persistent experience recall.
 */
export class MemoryPlane {
    
    /**
     * Gets a 360-degree context for an agent based on a specific prompt/task.
     */
    async getRelevantContext(projectId: string, task: string): Promise<string> {
        const memory = await projectMemory.getMemory(projectId);
        if (!memory) return 'No project context available.';

        logger.info({ projectId, task }, '[MemoryPlane] Retrieving multi-dimensional context');

        // 1. Semantic Code Context
        const similarCode = await projectMemory.searchSimilarCode(task, memory.framework);
        const codeSnips = similarCode.map((c: { file_path: string, chunk_content: string }) => `File: ${c.file_path}\nContent Snippet: ${c.chunk_content.substring(0, 500)}...`).join('\n\n');

        // 2. Experience Context (Lessons Learned)
        const lessons = await this.searchExperience(task);
        const lessonSnips = lessons.map(l => `- [${l.outcome.toUpperCase()}] ${l.lesson}`).join('\n');

        // 3. Architectural Context
        const archSummary = projectMemory.buildContextSummary(memory);

        return `
--- SYSTEM MEMORY: PROJECT ARCHITECTURE ---
${archSummary}

--- SYSTEM MEMORY: RELEVANT CODE SNIPPETS ---
${codeSnips || 'No similar code found.'}

--- SYSTEM MEMORY: PAST LESSONS & PATTERNS ---
${lessonSnips || 'No previous experience found for this pattern.'}
        `.trim();
    }

    /**
     * Records a "lesson learned" from an execution cycle into the global experience store.
     */
    async recordLesson(projectId: string, lesson: ExperienceLesson): Promise<void> {
        logger.info({ projectId, outcome: lesson.outcome }, '[MemoryPlane] Recording experience lesson');
        
        try {
            const embedding = await EmbeddingsEngine.generate(`${lesson.action} ${lesson.lesson}`);
            if (embedding) {
                await VectorStore.upsertExperience({
                    content: `${lesson.action} -> ${lesson.lesson}`,
                    embedding,
                    metadata: {
                        projectId,
                        outcome: lesson.outcome,
                        type: 'lesson',
                        context: lesson.context as Record<string, unknown>
                    }
                });
            }
        } catch (e) {
            logger.error({ error: e }, '[MemoryPlane] Failed to record lesson');
        }
    }

    private async searchExperience(query: string, limit = 3): Promise<Array<{ content: string, outcome: string, lesson: string }>> {
        const embedding = await EmbeddingsEngine.generate(query);
        if (!embedding) return [];
        return VectorStore.searchExperience(embedding, limit);
    }
}

export const memoryPlane = new MemoryPlane();

