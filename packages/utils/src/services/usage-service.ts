import { prisma } from '@libs/db';
import logger from '../logger';

export interface UsageMetric {
    model: string;
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    userId: string;
    tenantId: string;
    metadata?: Record<string, any>;
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
        const cost = (metric.promptTokens * pricing.prompt + metric.completionTokens * pricing.completion) / 1_000_000;

        try {
            await prisma.$transaction([
                // 1. Update overall tenant usage summary
                prisma.usage.upsert({
                    where: { tenantId: metric.tenantId },
                    update: {
                        totalTokens: { increment: metric.totalTokens },
                        promptTokens: { increment: metric.promptTokens },
                        completionTokens: { increment: metric.completionTokens },
                        totalCost: { increment: cost },
                        apiCalls: { increment: 1 }
                    },
                    create: {
                        tenantId: metric.tenantId,
                        totalTokens: metric.totalTokens,
                        promptTokens: metric.promptTokens,
                        completionTokens: metric.completionTokens,
                        totalCost: cost,
                        apiCalls: 1
                    }
                }),
                // 2. Create detailed usage log for auditing
                prisma.aiUsageLog.create({
                    data: {
                        tenantId: metric.tenantId,
                        userId: metric.userId,
                        model: metric.model,
                        promptTokens: metric.promptTokens,
                        completionTokens: metric.completionTokens,
                        totalTokens: metric.totalTokens,
                        cost: cost,
                        metadata: metric.metadata as any
                    }
                })
            ]);

            logger.info({ 
                tenantId: metric.tenantId, 
                userId: metric.userId, 
                tokens: metric.totalTokens, 
                cost 
            }, '[UsageService] Recorded AI usage and cost');
        } catch (error) {
            logger.error({ error, metric }, '[UsageService] Failed to record AI usage');
        }
    }
}

export const usageService = UsageService;
