import dotenv from 'dotenv';
dotenv.config();

import { startTracing } from '@packages/observability';
startTracing();

import express from 'express';
import { Orchestrator } from './orchestrator';
import { logger } from '@packages/utils';

const app = express();
const PORT = process.env.PORT || 4001;
const INTERNAL_KEY = process.env.INTERNAL_KEY || 'local-secret-key';
const orchestrator = new Orchestrator();

app.use(express.json());

// --- INTERNAL AUTH MIDDLEWARE ---
app.use((req: any, res: any, next: any) => {
    const key = req.headers['x-internal-key'];
    if (key !== INTERNAL_KEY) {
        logger.warn({ key }, '[Orchestrator] Unauthorized internal access attempt');
        return res.status(401).json({ error: 'Unauthorized: Invalid internal key' });
    }
    next();
});

// --- ROUTES ---
app.post('/run', async (req: any, res: any) => {
    const { prompt, userId, projectId, executionId, tenantId } = req.body;
    
    if (!prompt || !userId || !projectId || !executionId || !tenantId) {
        return res.status(400).json({ error: 'Missing required fields' });
    }

    try {
        logger.info({ executionId, projectId, tenantId }, '[Orchestrator] Received build request');
        const result = await orchestrator.run(prompt, userId, projectId, executionId, tenantId);
        res.json(result);
    } catch (error) {
        const msg = error instanceof Error ? error.message : String(error);
        logger.error({ error: msg, executionId }, '[Orchestrator] Workflow initiation failed');
        res.status(500).json({ success: false, error: msg });
    }
});

app.get('/health', (req: any, res: any) => {
    res.json({ status: 'healthy', service: 'orchestrator' });
});

app.listen(PORT, () => {
    logger.info(`[Orchestrator] Service running on port ${PORT}`);
});
