import express from 'express';
import type { Request, Response } from 'express';
import { db as prisma } from '@packages/db';
import { logger } from '@packages/observability';
import { MissionOrchestrator } from '@packages/core-engine';

export const recoveryRouter = express.Router();

recoveryRouter.post('/replay/:correlationId', async (req: Request, res: Response): Promise<void> => {
    try {
        const { correlationId } = req.params;

        // Extract the original intent
        const initialEvent = await prisma.governanceEvent.findFirst({
            where: { correlationId, eventType: 'security.intent.received' },
            orderBy: { timestamp: 'asc' }
        });

        if (!initialEvent) {
            res.status(404).json({ error: 'Original intent not found in ledger' });
            return;
        }

        let payloadData;
        try {
            payloadData = JSON.parse(initialEvent.payload);
        } catch (_e) {
            payloadData = initialEvent.payload;
        }

        const prompt = payloadData.prompt;
        const projectId = payloadData.projectId;

        if (!prompt) {
            res.status(400).json({ error: 'Cannot extract prompt from initial intent' });
            return;
        }

        const newCorrelationId = `replay-${Date.now()}-${correlationId}`;
        logger.info(`[StewardshipRecovery] Operator triggered replay of ${correlationId}. New Execution: ${newCorrelationId}`);

        // Async execution of the orchestrator to prevent blocking the HTTP response
        const orchestrator = new MissionOrchestrator();
        orchestrator.execute(newCorrelationId, prompt, projectId).catch((err: any) => {
            logger.error(`[StewardshipRecovery] Replay execution failed: ${err.message}`);
        });

        res.status(202).json({
            status: 'accepted',
            message: 'Replay initiated',
            originalCorrelationId: correlationId,
            newCorrelationId
        });

    } catch (err: any) {
        logger.error(`[StewardshipRecovery] Error initiating replay: ${err.message}`);
        res.status(500).json({ error: 'Internal server error' });
    }
});
