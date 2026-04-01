import { db as prisma } from '@packages/db';
import { logger } from './logger';
import { redis } from './redis';

export interface UsageMetric {
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    userId: string;
    organizationId: string;
    metadata?: Record<string, unknown>;
}

// Pricing per 1M tokens (USD)
const PRICING: Record<string, { prompt: number; completion: number }> = {
    'llama-3.3-70b-versatile': { prompt: 0.59, completion: 0.79 },
    'llama-3.1-8b-instant': { prompt: 0.05, completion: 0.08 },
    'mixtral-8x7b-32768': { prompt: 0.24, completion: 0.24 },
    'default': { prompt: 0.50, completion: 0.50 }
};

export class UsageService {
    /**
     * Records AI usage in both a summary (Usage table) and a detailed log (AiUsageLog table).
     */
    static async recordAiUsage(metric: UsageMetric): Promise<void> {
        const pricing = PRICING[metric.model] || PRICING.default;
        
        if (!pricing) {
            logger.warn({ model: metric.model }, '[UsageService] Pricing not found, using zero cost');
        }

        const promptCost = (metric.promptTokens * (pricing?.prompt ?? 0)) / 1_000_000;
        const completionCost = (metric.completionTokens * (pricing?.completion ?? 0)) / 1_000_000;
        const totalCost = promptCost + completionCost;

        try {
            // 1. Atomic Redis Update (For real-time throttling and accurate billing)
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const pipeline = (redis as any).pipeline();
            pipeline.hincrby(`usage:org:${metric.organizationId}`, 'totalTokens', metric.totalTokens);
            pipeline.hincrby(`usage:org:${metric.organizationId}`, 'apiCalls', 1);
            pipeline.expire(`usage:org:${metric.organizationId}`, 60 * 60 * 24 * 32); // 32 days TTL
            await pipeline.exec();

            // 2. DB Persistence (Transaction for consistency)
            await prisma.$transaction([
                // Update overall organization usage summary
                prisma.usage.upsert({
                    where: { tenantId: metric.organizationId },
                    update: {
                        totalTokens: { increment: metric.totalTokens },
                        promptTokens: { increment: metric.promptTokens },
                        completionTokens: { increment: metric.completionTokens },
                        totalCost: { increment: totalCost },
                        apiCalls: { increment: 1 }
                    },
                    create: {
                        tenantId: metric.organizationId,
                        totalTokens: metric.totalTokens,
                        promptTokens: metric.promptTokens,
                        completionTokens: metric.completionTokens,
                        totalCost: totalCost,
                        apiCalls: 1
                    }
                }),
                // Create detailed usage log for auditing
                prisma.aiUsageLog.create({
                    data: {
                        tenantId: metric.organizationId,
                        userId: metric.userId,
                        model: metric.model,
                        promptTokens: metric.promptTokens,
                        completionTokens: metric.completionTokens,
                        totalTokens: metric.totalTokens,
                        cost: totalCost,
                        metadata: (metric.metadata ?? {}) as any
                    }
                })
            ]);

            logger.info({ 
                organizationId: metric.organizationId, 
                userId: metric.userId, 
                tokens: metric.totalTokens, 
                cost: totalCost 
            }, '[UsageService] Recorded atomic AI usage');
        } catch (error) {
            logger.error({ error, metric }, '[UsageService] Failed to record AI usage');
        }
    }
}

export const usageService = UsageService;
