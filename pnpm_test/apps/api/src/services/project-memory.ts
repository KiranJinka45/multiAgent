import { supabaseAdmin } from '@shared/services/supabase-admin';
import logger from '@config/logger';
import { CodeChunker } from './memory/code-chunker';
import { EmbeddingsEngine } from './memory/embeddings-engine';
import { VectorStore } from './memory/vector-store';
import redis from '@queue';
import { createHash } from 'crypto';
import { eventBus } from '@shared/services/event-bus';

export interface ProjectMemory {
    projectId: string;
    framework: string;
    styling: string;
    backend: string;
    database: string;
    auth: string;
    features: string[];
    fileManifest: FileManifestEntry[];
    editHistory: EditHistoryEntry[];
    lastUpdated: string;
}

export interface FileManifestEntry {
    path: string;
    purpose: string;         // e.g. "Landing page", "Auth API route", "Database schema"
    agent: string;           // Which agent created/last modified it
    dependencies: string[];  // Other files this file imports from
    lastModified: string;
    version: number;
}

export interface EditHistoryEntry {
    timestamp: string;
    action: 'create' | 'modify' | 'delete';
    filePath: string;
    agent: string;
    reason: string;          // e.g. "User requested dark mode", "Auto-healer fixed import"
    diffSummary?: string;
}

class ProjectMemoryService {
    private memoryCache = new Map<string, ProjectMemory>();

    async getMemory(projectId: string): Promise<ProjectMemory | null> {
        // Check in-memory cache first
        if (this.memoryCache.has(projectId)) {
            return this.memoryCache.get(projectId)!;
        }

        try {
            const { data, error } = await supabaseAdmin
                .from('project_memory')
                .select('*')
                .eq('project_id', projectId)
                .single();

            if (error) {
                if (error.message.includes('does not exist') || error.message.includes('schema cache')) {
                    this.tableAvailable = false;
                    return null;
                }
                return null;
            }
            if (!data) return null;

            const memory: ProjectMemory = {
                projectId: data.project_id,
                framework: data.framework || 'nextjs',
                styling: data.styling || 'tailwind',
                backend: data.backend || data.database_type || 'api-routes',
                database: data.database_type || data.database || 'supabase',
                auth: data.auth || 'none',
                features: data.features || [],
                fileManifest: data.file_manifest || [],
                editHistory: data.edit_history || [],
                lastUpdated: data.updated_at
            };

            this.memoryCache.set(projectId, memory);
            this.tableAvailable = true;
            return memory;
        } catch (e) {
            logger.error({ projectId, error: e }, 'Failed to load project memory');
            return null;
        }
    }

    async initializeMemory(
        projectId: string,
        techStack: { framework: string; styling: string; backend: string; database: string; auth?: string },
        files: { path: string; content: string }[]
    ): Promise<ProjectMemory> {
        const manifest: FileManifestEntry[] = files.map(f => ({
            path: f.path,
            purpose: this.inferPurpose(f.path),
            agent: this.inferAgent(f.path),
            dependencies: this.extractImports(f.content),
            lastModified: new Date().toISOString(),
            version: 1
        }));

        const memory: ProjectMemory = {
            projectId,
            framework: techStack.framework,
            styling: techStack.styling,
            backend: techStack.backend,
            database: techStack.database,
            auth: techStack.auth || 'none',
            features: [],
            fileManifest: manifest,
            editHistory: [{
                timestamp: new Date().toISOString(),
                action: 'create',
                filePath: '*',
                agent: 'PlannerAgent',
                reason: 'Initial project generation'
            }],
            lastUpdated: new Date().toISOString()
        };

        await this.persistMemory(memory);
        this.memoryCache.set(projectId, memory);

        // ── Global AI Memory: Index Code Chunks ──
        try {
            const chunks = CodeChunker.chunkProject(techStack, files);
            const contents = chunks.map(c => c.content);
            const embeddings = await EmbeddingsEngine.generateBatch(contents);

            if (embeddings) {
                const chunksWithEmbeddings = chunks.map((c, i) => ({
                    content: c.content,
                    embedding: embeddings[i],
                    metadata: { ...c.metadata, projectId }
                }));
                await VectorStore.upsertChunks(chunksWithEmbeddings);
            }
        } catch (e) {
            logger.error({ projectId, error: e }, '[ProjectMemory] Failed to index embeddings');
        }

        return memory;
    }

    async recordEdit(
        projectId: string,
        filePath: string,
        action: 'create' | 'modify' | 'delete',
        agent: string,
        reason: string,
        newContent?: string
    ): Promise<void> {
        const memory = await this.getMemory(projectId);
        if (!memory) return;

        // Update file manifest
        const existingEntry = memory.fileManifest.find(f => f.path === filePath);
        if (action === 'delete') {
            memory.fileManifest = memory.fileManifest.filter(f => f.path !== filePath);
        } else if (existingEntry) {
            existingEntry.version += 1;
            existingEntry.lastModified = new Date().toISOString();
            existingEntry.agent = agent;
            if (newContent) {
                existingEntry.dependencies = this.extractImports(newContent);
            }
        } else {
            memory.fileManifest.push({
                path: filePath,
                purpose: this.inferPurpose(filePath),
                agent,
                dependencies: newContent ? this.extractImports(newContent) : [],
                lastModified: new Date().toISOString(),
                version: 1
            });
        }

        // Append edit history (keep last 100 entries)
        memory.editHistory.push({
            timestamp: new Date().toISOString(),
            action,
            filePath,
            agent,
            reason
        });
        if (memory.editHistory.length > 100) {
            memory.editHistory = memory.editHistory.slice(-100);
        }

        memory.lastUpdated = new Date().toISOString();
        await this.persistMemory(memory);
        this.memoryCache.set(projectId, memory);

        // Invalidate semantic search cache entries for this project
        // using SCAN to avoid blocking KEYS * on large Redis instances
        try {
            let cursor = '0';
            do {
                const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', 'mem:search:*', 'COUNT', 100);
                cursor = nextCursor;
                if (keys.length > 0) {
                    await redis.del(...keys);
                    logger.debug({ count: keys.length }, '[ProjectMemory] Invalidated search cache entries');
                }
            } while (cursor !== '0');
        } catch (e) {
            logger.warn({ error: e }, '[ProjectMemory] Search cache invalidation failed (non-fatal)');
        }
    }

    async addFeature(projectId: string, feature: string): Promise<void> {
        const memory = await this.getMemory(projectId);
        if (!memory) return;

        if (!memory.features.includes(feature)) {
            memory.features.push(feature);
            await this.persistMemory(memory);
            this.memoryCache.set(projectId, memory);
        }
    }

    /**
     * Performs a semantic search across the global code memory.
     * Results are cached in Redis for 5 minutes (TTL = 300s).
     */
    async searchSimilarCode(query: string, techStack?: string, limit = 5) {
        const cacheKey = `mem:search:${createHash('sha256').update(`${query}:${techStack || ''}`).digest('hex').slice(0, 24)}`;
        const CACHE_TTL = 300; // 5 minutes

        // --- Cache read ---
        try {
            const cached = await redis.get(cacheKey);
            if (cached) {
                logger.debug({ cacheKey }, '[ProjectMemory] Cache HIT for semantic search');
                return JSON.parse(cached);
            }
        } catch (cacheErr) {
            logger.warn({ cacheErr }, '[ProjectMemory] Redis cache read failed, falling through');
        }

        // --- Cache miss: run embedding + vector search ---
        const embedding = await EmbeddingsEngine.generate(query);
        if (!embedding) return [];
        const results = await VectorStore.searchSimilarCode(embedding, techStack, limit);

        // --- Cache write ---
        try {
            await redis.set(cacheKey, JSON.stringify(results), 'EX', CACHE_TTL);
        } catch (cacheErr) {
            logger.warn({ cacheErr }, '[ProjectMemory] Redis cache write failed');
        }

        return results;
    }

    /**
     * Given a user's edit request, determine which files need modification.
     * This is the core intelligence that prevents blind regeneration.
     */
    async getAffectedFiles(memory: ProjectMemory, editRequest: string): Promise<string[]> {
        const request = editRequest.toLowerCase();
        const affected: string[] = [];

        // 1. Semantic Search (New)
        try {
            const similarChunks = await this.searchSimilarCode(editRequest, memory.framework);
            for (const chunk of similarChunks) {
                affected.push(chunk.file_path);
            }
        } catch (e) {
            logger.warn({ error: e }, '[ProjectMemory] Semantic search failed during impact analysis');
        }

        // 2. Direct keyword matching (Legacy fallback/supplement)
        for (const file of memory.fileManifest) {
            const fp = file.path.toLowerCase();
            const purpose = file.purpose.toLowerCase();

            if (request.includes('dark mode') || request.includes('theme')) {
                if (fp.includes('tailwind') || fp.includes('globals.css') || fp.includes('layout') || fp.includes('theme')) {
                    affected.push(file.path);
                }
            }
            if (request.includes('auth') || request.includes('login') || request.includes('signup')) {
                if (fp.includes('auth') || fp.includes('login') || fp.includes('signup') || fp.includes('middleware') || purpose.includes('auth')) {
                    affected.push(file.path);
                }
            }
            if (request.includes('dashboard')) {
                if (fp.includes('dashboard') || fp.includes('layout')) {
                    affected.push(file.path);
                }
            }
            if (request.includes('database') || request.includes('schema')) {
                if (fp.includes('schema') || fp.includes('migration') || fp.includes('prisma') || purpose.includes('database')) {
                    affected.push(file.path);
                }
            }
            if (request.includes('api') || request.includes('endpoint')) {
                if (fp.includes('api/') || fp.includes('route')) {
                    affected.push(file.path);
                }
            }
            if (request.includes('page') || request.includes('component')) {
                if (fp.includes('page.tsx') || fp.includes('components/')) {
                    affected.push(file.path);
                }
            }
            if (request.includes('style') || request.includes('css') || request.includes('design')) {
                if (fp.includes('.css') || fp.includes('tailwind') || fp.includes('globals')) {
                    affected.push(file.path);
                }
            }
        }

        // Deduplicate
        return [...new Set(affected)];
    }

    /**
     * Build a context summary string for the AI agent, so it knows the project state
     */
    buildContextSummary(memory: ProjectMemory): string {
        return `PROJECT CONTEXT:
Framework: ${memory.framework}
Styling: ${memory.styling}
Backend: ${memory.backend}
Database: ${memory.database}
Auth: ${memory.auth}
Features: ${memory.features.join(', ') || 'none yet'}
Total Files: ${memory.fileManifest.length}
Recent Edits: ${memory.editHistory.slice(-5).map(e => `${e.action} ${e.filePath} (${e.reason})`).join(' | ')}
File Map: ${memory.fileManifest.map(f => `${f.path} [${f.purpose}]`).join(', ')}`;
    }

    // ── Private Helpers ──────────────────────────────────────────────

    private tableAvailable: boolean | null = null; // null = not yet checked

    private async persistMemory(memory: ProjectMemory): Promise<void> {
        // If we already know the table doesn't exist, skip DB persistence silently
        if (this.tableAvailable === false) return;

        try {
            const payload = {
                project_id: memory.projectId,
                framework: memory.framework,
                styling: memory.styling,
                backend: memory.backend,
                database_type: memory.database,
                auth: memory.auth,
                features: memory.features,
                file_manifest: memory.fileManifest,
                edit_history: memory.editHistory,
                updated_at: new Date().toISOString()
            };

            const { error } = await supabaseAdmin
                .from('project_memory')
                .upsert(payload, { onConflict: 'project_id' });

            if (error) {
                if (error.message.includes('does not exist') || error.message.includes('schema cache')) {
                    logger.warn({ projectId: memory.projectId }, 'project_memory table not found. Using in-memory only. Run migration 004_project_memory.sql to enable persistence.');
                    this.tableAvailable = false;
                    return;
                }
                throw error;
            }
            this.tableAvailable = true;
        } catch (e) {
            logger.error({ projectId: memory.projectId, error: e }, 'Failed to persist project memory');
        }
    }

    private inferPurpose(filePath: string): string {
        const fp = filePath.toLowerCase();
        if (fp.includes('page.tsx') || fp.includes('page.jsx')) return 'Page component';
        if (fp.includes('layout')) return 'Layout wrapper';
        if (fp.includes('api/')) return 'API route';
        if (fp.includes('components/')) return 'UI component';
        if (fp.includes('schema') || fp.includes('migration')) return 'Database schema';
        if (fp.includes('middleware')) return 'Middleware';
        if (fp.includes('globals.css')) return 'Global styles';
        if (fp.includes('tailwind')) return 'Tailwind configuration';
        if (fp.includes('package.json')) return 'Package manifest';
        if (fp.includes('next.config')) return 'Next.js configuration';
        if (fp.includes('.test.') || fp.includes('.spec.')) return 'Test file';
        if (fp.includes('docker')) return 'Docker configuration';
        if (fp.includes('lib/') || fp.includes('utils/')) return 'Utility/library';
        if (fp.includes('hooks/')) return 'React hook';
        if (fp.includes('context/') || fp.includes('provider')) return 'Context provider';
        return 'Project file';
    }

    private inferAgent(filePath: string): string {
        const fp = filePath.toLowerCase();
        if (fp.includes('schema') || fp.includes('migration') || fp.includes('seed')) return 'DatabaseAgent';
        if (fp.includes('api/') || fp.includes('middleware') || fp.includes('lib/')) return 'BackendAgent';
        if (fp.includes('page') || fp.includes('component') || fp.includes('layout') || fp.includes('.css')) return 'FrontendAgent';
        if (fp.includes('docker') || fp.includes('ci') || fp.includes('deploy')) return 'DeploymentAgent';
        if (fp.includes('test') || fp.includes('spec')) return 'TestingAgent';
        return 'FrontendAgent';
    }

    private extractImports(content: string): string[] {
        const imports: string[] = [];
        const importRegex = /(?:import|require)\s*(?:\(?\s*['"]([^'"]+)['"]\s*\)?|.*from\s+['"]([^'"]+)['"])/g;
        let match;
        while ((match = importRegex.exec(content)) !== null) {
            const importPath = match[1] || match[2];
            if (importPath && !importPath.startsWith('react') && !importPath.startsWith('next')) {
                imports.push(importPath);
            }
        }
        return imports;
    }
}

export const projectMemory = new ProjectMemoryService();
