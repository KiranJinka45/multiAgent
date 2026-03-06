import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import Redis from 'ioredis';
import { Queue } from 'bullmq';
import { QUEUE_FREE, QUEUE_PRO } from '@queue/build-queue';
import redis from '@queue/redis-client';
import dotenv from 'dotenv';
import cors from 'cors';

dotenv.config({ path: '.env.local' });

const app = express();
app.use(cors());

const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    }
});

const REDIS_URLS = process.env.REDIS_URLS ? process.env.REDIS_URLS.split(',') : [process.env.REDIS_URL || 'redis://localhost:6379'];
const redisSub = new Redis(REDIS_URLS[0]);

const PORT = 3005;

// Health & Metrics Endpoint
app.get('/health', async (req, res) => {
    try {
        const workerHealth = await redis.get('system:health:worker');
        const freeQueue = new Queue(QUEUE_FREE, { connection: redis });
        const proQueue = new Queue(QUEUE_PRO, { connection: redis });

        const [waitingFree, activeFree, waitingPro, activePro] = await Promise.all([
            freeQueue.getWaitingCount(),
            freeQueue.getActiveCount(),
            proQueue.getWaitingCount(),
            proQueue.getActiveCount()
        ]);

        res.json({
            status: 'ok',
            uptime: process.uptime(),
            worker: workerHealth ? JSON.parse(workerHealth) : { status: 'offline' },
            queues: {
                free: { waiting: waitingFree, active: activeFree },
                pro: { waiting: waitingPro, active: activePro }
            },
            redis: redis.status
        });
    } catch (error) {
        res.status(500).json({ status: 'error', error: String(error) });
    }
});

io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    socket.on('join-project', async (projectId: string) => {
        const room = `project:${projectId}`;
        socket.join(room);
        console.log(`[Socket.IO] Client ${socket.id} joined room: ${room}`);

        // Catch-up logic: Fetch latest build state from Redis and send to the joining client
        try {
            // We use the same key pattern as event-bus.ts: build:state:{executionId}
            // However, the client joins by projectId. We might need a mapping or check for multiple executions.
            // For now, let's look for keys pattern build:state:* and find one matching the project if possible,
            // or rely on the fact that the orchestrator publishes to 'build-events' which we already listen to.

            // Optimization: If the orchestrator stores the 'latest' state in a predictable key:
            const latestState = await redisSub.get(`project:state:${projectId}`);
            if (latestState) {
                socket.emit('build-update', JSON.parse(latestState));
                console.log(`[Socket.IO] Sent catch-up state to ${socket.id} for project ${projectId}`);
            }
        } catch (error) {
            console.error('[Socket.IO] Catch-up error:', error);
        }
    });

    socket.on('disconnect', () => {
        console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
});

redisSub.subscribe('build-events', (err, count) => {
    if (err) {
        console.error('[Socket.IO] Redis Subscription Error:', err);
    } else {
        console.log(`[Socket.IO] Subscribed to Redis 'build-events' channel. Count: ${count}`);
    }
});

redisSub.on('message', (channel, message) => {
    if (channel === 'build-events') {
        try {
            const payload = JSON.parse(message);
            const { projectId, executionId } = payload;

            if (projectId) {
                // Cache the latest state for this project to enable instant catch-up for new listeners
                redisSub.setex(`project:state:${projectId}`, 3600, message); // TTL 1 hour

                io.to(`project:${projectId}`).emit('build-update', payload);
                console.log(`[Socket.IO] Broadcasted build-update to project:${projectId}`);
            } else {
                // If no project ID context, broadcast to all
                io.emit('build-update', payload);
            }
        } catch (error) {
            console.error('[Socket.IO] Failed to parse Redis message:', error);
        }
    }
});

server.listen(PORT, () => {
    console.log(`[Socket.IO] Realtime server running on http://localhost:${PORT}`);
});
