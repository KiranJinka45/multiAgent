import { Server } from 'socket.io';
import Redis from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';
import pino from 'pino';
import http from 'http';

const elog = pino({ level: 'info' });

export function initSocket(server: http.Server) {
    const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
    const pubClient = new Redis(REDIS_URL);
    const subClient = pubClient.duplicate();

    const io = new Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });

    io.adapter(createAdapter(pubClient, subClient));

    io.on('connection', (socket) => {
        elog.info({ socketId: socket.id }, '[Socket] User connected');

        socket.on('subscribe', (buildId: string) => {
            elog.info({ socketId: socket.id, buildId }, '[Socket] Subscribing to build room');
            socket.join(`build:${buildId}`);
        });

        socket.on('disconnect', () => {
            elog.info({ socketId: socket.id }, '[Socket] User disconnected');
        });
    });

    // Redis subscriber for all build events
    const buildEventSubscriber = pubClient.duplicate();
    buildEventSubscriber.subscribe('build-events', (err) => {
        if (err) elog.error({ err }, '[Socket] Redis subscribe error');
    });

    buildEventSubscriber.on('message', (channel, message) => {
        if (channel === 'build-events') {
            try {
                const event = JSON.parse(message);
                const { executionId, type } = event;
                
                if (!executionId || !type) return;

                // Broadcast to the specific build room
                // Event types: 'progress', 'thought', 'agent', 'complete', 'error'
                io.to(`build:${executionId}`).emit(type, event);
                elog.debug({ executionId, type }, '[Socket] Broadcasted build event');
            } catch (err) {
                elog.error({ err }, '[Socket] Failed to parse or broadcast message');
            }
        }
    });

    return io;
}
