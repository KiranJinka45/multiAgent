import { redis } from '@/services/queue';
import { v4 as uuidv4 } from 'uuid';
import logger from '@/config/logger';

export interface PreviewRegistration {
    previewId: string;
    projectId: string;
    containerHost: string;
    containerPort: number;
    status: 'starting' | 'running' | 'sleeping' | 'error';
    createdAt: number;
    updatedAt: number;
    lastAccessedAt?: number;
    expiresAt: number;
    accessToken?: string; // Security token for proxy validation
}

class PreviewRegistryService {
    private readonly REG_PREFIX = 'preview:{reg}:';
    private readonly PROJECT_MAP_PREFIX = 'project:{map}:';
    private readonly DEFAULT_TTL = 3600 * 24; // 24 hours

    /**
     * Register a new preview session for a project.
     * Generates a unique UUID for the preview.
     */
    async register(projectId: string, host: string, port: number): Promise<string> {
        const previewId = uuidv4();
        const now = Date.now();
        
        const registration: PreviewRegistration = {
            previewId,
            projectId,
            containerHost: host,
            containerPort: port,
            status: 'starting',
            accessToken: uuidv4(),
            createdAt: now,
            updatedAt: now,
            expiresAt: now + (this.DEFAULT_TTL * 1000)
        };

        const pipeline = redis.pipeline();
        
        // 1. Store the registration record
        pipeline.setex(
            `${this.REG_PREFIX}${previewId}`,
            this.DEFAULT_TTL,
            JSON.stringify(registration)
        );

        // 2. Map project to current preview
        pipeline.setex(
            `${this.PROJECT_MAP_PREFIX}${projectId}`,
            this.DEFAULT_TTL,
            previewId
        );

        await pipeline.exec();
        
        logger.info({ projectId, previewId }, '[PreviewRegistry] Registered new preview session');
        return previewId;
    }

    /**
     * Lookup registration by previewId.
     */
    async lookup(previewId: string): Promise<PreviewRegistration | null> {
        const raw = await redis.get(`${this.REG_PREFIX}${previewId}`);
        if (!raw) return null;
        return JSON.parse(raw);
    }

    /**
     * Lookup previewId by projectId.
     */
    async getPreviewId(projectId: string): Promise<string | null> {
        return await redis.get(`${this.PROJECT_MAP_PREFIX}${projectId}`);
    }

    /**
     * Update the status of a preview.
     */
    async updateStatus(previewId: string, status: PreviewRegistration['status']): Promise<void> {
        const registration = await this.lookup(previewId);
        if (!registration) return;

        registration.status = status;
        registration.updatedAt = Date.now();

        await redis.setex(
            `${this.REG_PREFIX}${previewId}`,
            this.DEFAULT_TTL,
            JSON.stringify(registration)
        );
    }

    /**
     * Record a heartbeat to prevent expiration and update idle timers.
     */
    async heartbeat(previewId: string): Promise<void> {
        const registration = await this.lookup(previewId);
        if (!registration) return;

        registration.updatedAt = Date.now();
        
        await redis.setex(
            `${this.REG_PREFIX}${previewId}`,
            this.DEFAULT_TTL,
            JSON.stringify(registration)
        );
    }

    async getAll(): Promise<PreviewRegistration[]> {
        // Efficient retrieval using scan or keys (keys is legacy, but we keep it for now with the new prefix)
        const keys = await redis.keys(`${this.REG_PREFIX}*`);
        if (keys.length === 0) return [];

        const rawRecords = await redis.mget(...keys);
        return rawRecords
            .filter((r): r is string => r !== null)
            .map(r => JSON.parse(r));
    }
}

export const previewRegistry = new PreviewRegistryService();
