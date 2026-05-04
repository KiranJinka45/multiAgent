"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocket = initSocket;
const socket_io_1 = require("socket.io");
const ioredis_1 = require("ioredis");
const redis_adapter_1 = require("@socket.io/redis-adapter");
const pino_1 = __importDefault(require("pino"));
const elog = (0, pino_1.default)({ level: 'info' });
function initSocket(server) {
    const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
    const pubClient = new ioredis_1.Redis(REDIS_URL);
    const subClient = pubClient.duplicate();
    const io = new socket_io_1.Server(server, {
        cors: {
            origin: "*",
            methods: ["GET", "POST"]
        }
    });
    io.adapter((0, redis_adapter_1.createAdapter)(pubClient, subClient));
    io.on('connection', (socket) => {
        elog.info({ socketId: socket.id }, '[Socket] User connected');
        socket.on('subscribe', (buildId) => {
            elog.info({ socketId: socket.id, buildId }, '[Socket] Subscribing to build room');
            socket.join(`build:${buildId}`);
            // Acknowledgment for load test validation with telemetry
            socket.emit('subscribed', {
                room: `build:${buildId}`,
                ts: Date.now(),
                socketId: socket.id
            });
        });
        socket.on('broadcast', (payload) => {
            const { roomId } = payload;
            if (roomId) {
                // Relay to all clients in the room for fan-out testing
                io.to(roomId).emit('progress', payload);
            }
        });
        socket.on('disconnect', () => {
            elog.info({ socketId: socket.id }, '[Socket] User disconnected');
        });
    });
    // Redis subscriber for all build and log events
    const eventSubscriber = pubClient.duplicate();
    eventSubscriber.subscribe('build-events', 'log-events', (err) => {
        if (err)
            elog.error({ err }, '[Socket] Redis subscribe error');
    });
    eventSubscriber.on('message', (channel, message) => {
        try {
            const event = JSON.parse(message);
            if (channel === 'build-events') {
                const { executionId, type } = event;
                if (!executionId || !type)
                    return;
                // Broadcast to build room (Mission Steps)
                io.to(`build:${executionId}`).emit(type, event);
                elog.debug({ executionId, type }, '[Socket] Broadcasted build event');
            }
            else if (channel === 'log-events') {
                const { missionId, type } = event;
                // Broadcast to mission or global log room
                const room = missionId ? `logs:${missionId}` : 'logs:global';
                io.to(room).emit('log-update', event);
                elog.debug({ room }, '[Socket] Broadcasted log event');
            }
        }
        catch (err) {
            elog.error({ err }, '[Socket] Failed to parse or broadcast message');
        }
    });
    return io;
}
//# sourceMappingURL=socket.js.map