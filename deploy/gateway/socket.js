"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.initSocket = initSocket;
const socket_io_1 = require("socket.io");
const ioredis_1 = __importDefault(require("ioredis"));
const redis_adapter_1 = require("@socket.io/redis-adapter");
const pino_1 = __importDefault(require("pino"));
const elog = (0, pino_1.default)({ level: 'info' });
function initSocket(server) {
    const REDIS_URL = process.env.REDIS_URL || 'redis://localhost:6379';
    const pubClient = new ioredis_1.default(REDIS_URL);
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
        });
        socket.on('disconnect', () => {
            elog.info({ socketId: socket.id }, '[Socket] User disconnected');
        });
    });
    // Redis subscriber for all build events
    const buildEventSubscriber = pubClient.duplicate();
    buildEventSubscriber.subscribe('build-events', (err) => {
        if (err)
            elog.error({ err }, '[Socket] Redis subscribe error');
    });
    buildEventSubscriber.on('message', (channel, message) => {
        if (channel === 'build-events') {
            try {
                const event = JSON.parse(message);
                const { executionId, type } = event;
                if (!executionId || !type)
                    return;
                // Broadcast to the specific build room
                // Event types: 'progress', 'thought', 'agent', 'complete', 'error'
                io.to(`build:${executionId}`).emit(type, event);
                elog.debug({ executionId, type }, '[Socket] Broadcasted build event');
            }
            catch (err) {
                elog.error({ err }, '[Socket] Failed to parse or broadcast message');
            }
        }
    });
    return io;
}
//# sourceMappingURL=socket.js.map