import { Router } from 'express';
import { db } from '@libs/db';
import { logger } from '@libs/utils';
import { ResumeAgent } from '@libs/brain';
import { DistributedExecutionContext } from '@libs/core-engine';

const router = Router();
const resumeAgent = new ResumeAgent();

router.post('/optimize', async (req, res) => {
    const { resumeText, targetRole, userId, tenantId } = req.body;
    const startTime = Date.now();

    try {
        // 1. Track Event: resume_submitted
        await db.event.create({
            data: {
                type: 'resume_submitted',
                userId: userId || 'anonymous',
                tenantId: tenantId || 'default',
                metadata: { targetRole }
            }
        });

        // 2. Invoke Agent
        const executionId = `resume-${Date.now()}`;
        const context = new DistributedExecutionContext(executionId);
        await context.init(
            userId || 'anonymous', 
            'resume-optimization', 
            targetRole, 
            executionId
        );

        const result = await resumeAgent.execute({ resumeText, targetRole }, context);

        // 3. Track Event: optimization_completed
        await db.event.create({
            data: {
                type: 'optimization_completed',
                userId: userId || 'anonymous',
                tenantId: tenantId || 'default',
                metadata: { 
                    score: (result.data as { score: number }).score,
                    latency: Date.now() - startTime
                }
            }
        });

        res.json(result.data);

    } catch (error) {
        logger.error({ error }, '[ResumeRoute] Optimization failed');
        res.status(500).json({ error: 'Failed to optimize resume' });
    }
});

export default router;
