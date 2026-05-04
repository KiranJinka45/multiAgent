import express from 'express';
import { createServer } from 'http';
import { redis, apiRequestDurationSeconds, registry } from '@packages/utils';
import dotenv from 'dotenv';
import cors from 'cors';
import { Server } from 'socket.io';

import { startCollaborationServer } from './yjs-server';
import { commandGateway } from './command-gateway';
import { missionController } from '@packages/utils';

// Initialize OpenTelemetry Tracing
// initInstrumentation('multiagent-api-orchestrator');


dotenv.config({ path: '.env.local' });

const app = express();
app.use(cors());

// Metrics Middleware
app.use((req, res, next) => {
    const end = apiRequestDurationSeconds.startTimer();
    res.on('finish', () => {
        end({
            method: req.method,
            route: req.path, // req.route?.path often not available in global middleware
            status_code: res.statusCode.toString(),
        });
    });
    next();
});

// Health Check
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: Date.now(), service: 'multiagent-api-orchestrator' });
});

// Prometheus Metrics Endpoint
app.get('/metrics', async (req, res) => {
    try {
        res.set('Content-Type', registry.contentType);
        res.end(await registry.metrics());
    } catch (err) {
        res.status(500).end(err);
    }
});

/**
 * REST API: Zero-Iteration Sandbox
 */

// POST /generate - Initiate an app generation mission
app.post('/generate', express.json(), async (req, res) => {
    const { prompt, userId, projectId, template } = req.body;
    
    if (!prompt) {
        return res.status(400).json({ error: 'Prompt is required' });
    }

    const result = await commandGateway.submitMission(
        userId || 'anonymous',
        projectId || `proj-${Date.now()}`,
        prompt,
        { template }
    );

    if (result.success) {
        res.status(202).json(result);
    } else {
        res.status(500).json(result);
    }
});

// GET /status/:missionId - Poll for mission progress
app.get('/status/:missionId', async (req, res) => {
    const { missionId } = req.params;
    
    try {
        const mission = await missionController.getMission(missionId);
        if (!mission) {
            return res.status(404).json({ error: 'Mission not found' });
        }
        res.json(mission);
    } catch (err) {
        console.error(`[StatusAPI] Error fetching mission ${missionId}:`, err);
        res.status(500).json({ error: 'Failed to fetch mission status' });
    }
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

// Socket.IO
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
const YJS_PORT = 3011;

// server.listen(PORT, '0.0.0.0', () => {
//     console.log(`[API-Orchestrator] Socket Server running on port ${PORT}`);
// });

// Start Yjs Collaboration Server
startCollaborationServer(YJS_PORT);

