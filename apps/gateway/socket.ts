import { Server } from 'socket.io';
import Redis from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';
import pino from 'pino';
import http from 'http';
import { eventBus } from '@packages/events';

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

        /**
         * REPLAY LOGIC
         * Allows frontend to request missed events since a specific ID.
         */
        socket.on('replay-events', async ({ buildId, lastId }: { buildId: string, lastId: string }) => {
            elog.info({ socketId: socket.id, buildId, lastId }, '[Socket] Replay requested');
            const streamKey = `build:stream:${buildId}`;
            try {
                // Fetch events from stream starting AFTER lastId
                const events = await eventBus.replayStream(streamKey, lastId === '0' ? '-' : `(${lastId}`, '+');
                for (const event of events) {
                    socket.emit(event.data.type, { ...event.data, _sequence: event.id });
                }
            } catch (err) {
                elog.error({ err, buildId }, '[Socket] Replay failed');
            }
        });

        socket.on('disconnect', () => {
            elog.info({ socketId: socket.id }, '[Socket] User disconnected');
        });
    });

    /**
     * REAL-TIME STREAM CONSUMER
     * Listen to the global build events channel and broadcast to rooms.
     */
    eventBus.subscribe('build-events', (event: any) => {
        const { executionId, type } = event;
        if (!executionId || !type) return;

        // Broadcast to the specific build room
        // Note: Real-time broadcast might not have the ID yet if it came from Pub/Sub
        // but the client will use the sequence ID from the Stream during replay.
        io.to(`build:${executionId}`).emit(type, event);
    });

    return io;
}

