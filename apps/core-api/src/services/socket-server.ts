import express, { Request, Response, NextFunction } from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import { redis, registry } from '@libs/utils/server';
import { logger } from '@libs/observability';
import dotenv from 'dotenv';
import cors from 'cors';
import { initTelemetry } from '@libs/observability';

dotenv.config({ path: '.env.local' });

initTelemetry('multiagent-core-api');

const INTERNAL_KEY = process.env.INTERNAL_KEY || 'local-secret-key';

const app = express();
app.use(cors());

// --- INTERNAL SECURITY ---
app.use((req: Request, res: Response, next: NextFunction) => {
    const key = req.headers['x-internal-key'];
    if (key !== INTERNAL_KEY) {
        logger.warn(`[Core-API] Unauthorized access attempt from IP: ${req.ip}`);
        return res.status(401).json({ error: 'Unauthorized: Internal service key required' });
    }
    next();
});

// Metrics
app.get('/metrics', async (req: Request, res: Response) => {
    res.set('Content-Type', registry.contentType);
    res.end(await registry.metrics());
});

// Health Check
app.get('/health', (req: Request, res: Response) => {
    res.json({ status: 'healthy', timestamp: Date.now(), service: 'core-api' });
});

/**
 * Preview Proxy Logic
 * Resolves project IDs to their isolated container ports via Redis.
 */
app.use('/preview/:projectId', async (req, res) => {
    const { projectId } = req.params;
    
    try {
        const targetPortStr = await redis.get(`preview:port:${projectId}`);
        if (!targetPortStr) {
            return res.status(404).send('Preview not found or expired');
        }

        const targetPort = parseInt(targetPortStr, 10);
        console.log(`[PreviewProxy] Steering ${projectId} to internal port ${targetPort}`);
        res.status(200).send(`[Preview Proxy Ready] Project: ${projectId} -> Port: ${targetPort}`);
    } catch (err) {
        console.error('[PreviewProxy] Error:', err);
        res.status(500).send('Proxy Gateway Error');
    }
});

const server = createServer(app);

// Socket.IO (Local Mode for Stability)
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    socket.on('subscribe', (executionId: string) => {
        console.log(`[Socket] Subscribing ${socket.id} to build:${executionId}`);
        socket.join(`build:${executionId}`);
    });

    socket.on('disconnect', () => {
        console.log(`[Socket] Disconnected: ${socket.id}`);
    });
});

const PORT = parseInt(process.env.PORT || '3001', 10);

server.listen(PORT, '0.0.0.0', () => {
    console.log(`[API-Orchestrator] Socket Server running on port ${PORT}`);
    console.log('[System] Yjs & Redis-Adapter DISABLED for stability (Recovery Mode)');
});
