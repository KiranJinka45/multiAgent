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
const events_1 = require("@packages/events");
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
        /**
         * REPLAY LOGIC
         * Allows frontend to request missed events since a specific ID.
         */
        socket.on('replay-events', async ({ buildId, lastId }) => {
            elog.info({ socketId: socket.id, buildId, lastId }, '[Socket] Replay requested');
            const streamKey = `build:stream:${buildId}`;
            try {
                // Fetch events from stream starting AFTER lastId
                const events = await events_1.eventBus.replayStream(streamKey, lastId === '0' ? '-' : `(${lastId}`, '+');
                for (const event of events) {
                    socket.emit(event.data.type, { ...event.data, _sequence: event.id });
                }
            }
            catch (err) {
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
    events_1.eventBus.subscribe('build-events', (event) => {
        const { executionId, type } = event;
        if (!executionId || !type)
            return;
        // Broadcast to the specific build room
        // Note: Real-time broadcast might not have the ID yet if it came from Pub/Sub
        // but the client will use the sequence ID from the Stream during replay.
        io.to(`build:${executionId}`).emit(type, event);
    });
    return io;
}
//# sourceMappingURL=socket.js.map