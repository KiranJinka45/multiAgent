import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import Redis from 'ioredis';
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

io.on('connection', (socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    socket.on('join-project', (projectId: string) => {
        const room = `project:${projectId}`;
        socket.join(room);
        console.log(`[Socket.IO] Client ${socket.id} joined room: ${room}`);
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
            const { projectId } = payload;

            if (projectId) {
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
