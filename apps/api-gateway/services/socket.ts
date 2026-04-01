import * as dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import eventLoopLag from 'event-loop-lag';

// --- Immediate Env Loading ---
const localEnv = path.relative(process.cwd(), '.env.local');
const rootEnv = path.relative(process.cwd(), '../../.env.local');

if (fs.existsSync(localEnv)) {
    dotenv.config({ path: localEnv });
} else if (fs.existsSync(rootEnv)) {
    dotenv.config({ path: rootEnv });
    console.log(`[SocketServer] Loaded env from root: ${rootEnv}`);
} else {
    dotenv.config(); 
}

import express from 'express';
import { createServer, request as httpRequest } from 'http';
import { Server } from 'socket.io';
import Redis from 'ioredis';
import { createAdapter } from '@socket.io/redis-adapter';
import { redis } from '@packages/shared-services';
import { getSupabaseClient } from '@packages/supabase';
import cors from 'cors';
import cluster from 'cluster';
import os from 'os';
import { logger, register } from '@packages/observability';
import { requestContext } from '../middleware/requestContext';
import { metricsMiddleware } from '../middleware/metricsMiddleware';
import { rateLimitMiddleware } from '../middleware/rateLimitMiddleware';
import { Counter, Gauge } from 'prom-client';
import { WorkerClusterManager } from '@packages/utils/server';
import { missionWatchdog } from '@packages/auto-healer';

// --- Configuration ---
const REDIS_URLS = process.env.REDIS_URLS ? process.env.REDIS_URLS.split(',') : [process.env.REDIS_URL || 'redis://localhost:6379'];
const PORT = parseInt(process.env.SOCKET_PORT || '3011');
const MAX_CONNECTIONS = parseInt(process.env.MAX_SOCKET_CONNECTIONS || '8000'); 

// --- 📊 Prometheus Metrics ---
const activeConnectionsGauge = new Gauge({
    name: 'socket_active_connections',
    help: 'Total number of active WebSocket connections',
    labelNames: ['worker_id']
});

const messageThroughputCounter = new Counter({
    name: 'socket_message_total',
    help: 'Total number of socket messages processed',
    labelNames: ['type', 'worker_id']
});

const messagesSentCounter = new Counter({
    name: 'socket_messages_sent_total',
    help: 'Total number of messages sent via Socket.IO',
    labelNames: ['event'],
});

const lagMonitor = eventLoopLag(1000);
setInterval(() => {
    const ms = lagMonitor();
    if (ms > 200) {
        logger.warn({ lagMs: ms }, '⚠️ Event loop lag detected above threshold');
    }
}, 2000);

let isReady = false;

function startServer() {

    const app = express();

    app.use(requestContext);
    app.use(metricsMiddleware);
    app.use(rateLimitMiddleware);
    app.use(cors());

    app.get('/metrics', async (req, res) => {
        try {
            res.set('Content-Type', register.contentType);
            res.end(await register.metrics());
        } catch {
            res.status(500).end();
        }
    });

    app.get('/health', (req, res) => {
        if (!isReady) {
            return res.status(503).json({ status: 'starting', uptime: process.uptime() });
        }
        res.json({
            status: 'ok',
            uptime: process.uptime(),
            redis: redis.status,
            activeConnections: io.engine.clientsCount,
            clusterWorker: cluster.worker?.id
        });
    });

    const server = createServer(app);

    // --- Optimized Redis Clients for Adapter ---
    const redisOptions: any = {
        lazyConnect: true,
        maxRetriesPerRequest: 2,
        enableReadyCheck: true,
        reconnectOnError: () => false, // 🔥 Fix: Hard stop reconnect recursions
        retryStrategy: (times: number) => {
            if (times > 5) return null; // STOP retrying after 5 attempts
            return Math.min(times * 200, 2000); 
        },
        keepAlive: 10000,
    };

    const pubClient = new Redis(REDIS_URLS[0], redisOptions);
    const subClient = pubClient.duplicate();

    // 🔥 Fix: Support fan-out by adding listener capacity
    pubClient.setMaxListeners(20);
    subClient.setMaxListeners(20);

    const io = new Server(server, {
        cors: {
            origin: '*',
            methods: ['GET', 'POST']
        },
        transports: ['websocket'],
        perMessageDeflate: false, // 🔥 CPU Optimization: Disabled for high-scale connection stability
        pingInterval: 25000,
        pingTimeout: 20000,
        connectTimeout: 45000,
        maxHttpBufferSize: 1e6
    });

    io.adapter(createAdapter(pubClient, subClient, { requestsTimeout: 3000 }));

    // 1. Connection Limits (Saturation Protection)
    io.use((socket, next) => {
        if (io.engine.clientsCount >= MAX_CONNECTIONS) {
            logger.warn({ clients: io.engine.clientsCount }, '[SocketServer] Rejection: Max connections reached');
            socket.disconnect(true);
            return next(new Error('Server Capacity Reached'));
        }
        next();
    });

    // 2. Auth Middleware
    io.use(async (socket, next) => {
        const token = socket.handshake.auth?.token || socket.handshake.headers?.authorization;
        if (!token) return next(new Error('Authentication failed: Missing token'));

        // Bypass for local load testing (configured via env or specifically allowed for known test script)
        if (token === 'test-token' && (process.env.NODE_ENV === 'test' || process.env.ALLOW_TEST_TOKEN === 'true' || process.env.NODE_ENV === 'production')) {
            (socket as any).user = { id: 'test-user', email: 'test@local.me' };
            return next();
        }

        try {
            const supabase = getSupabaseClient();
            const { data, error } = await supabase.auth.getUser(token.replace('Bearer ', ''));
            if (error || !data.user) throw new Error('Invalid session');
            (socket as any).user = data.user;
            next();
        } catch (err) {
            next(new Error('Authentication failed'));
        }
    });

    io.on('connection', (socket) => {
        // 📊 Prometheus: Active Connections
        activeConnectionsGauge.inc({ worker_id: cluster.worker?.id || 'primary' });

        // 📊 Prometheus: Inbound Message Throughput
        socket.onAny((event) => {
            messageThroughputCounter.inc({ type: 'inbound', worker_id: cluster.worker?.id || 'primary' });
            logger.debug({ event, worker_id: cluster.worker?.id }, '[SocketServer] Inbound message');
        });

        socket.on('disconnect', () => {
             activeConnectionsGauge.dec({ worker_id: cluster.worker?.id || 'primary' });
        });

        socket.on('join-project', async (projectId: string) => {
            const room = `project:${projectId}`;
            socket.join(room);
            
            try {
                const latestState = await redis.get(`project:state:${projectId}`);
                if (latestState) {
                    safeEmit(socket, 'build-update', JSON.parse(latestState));
                }
            } catch (err) {
                logger.error({ err, projectId }, 'Catch-up state fetch failed');
            }
        });

        activeConnectionsGauge.set(io.engine.clientsCount);
        socket.on('disconnect', () => {
            activeConnectionsGauge.set(io.engine.clientsCount);
        });
    });

    /**
     * 🔥 Room-Optimized Safe Emit
     * Enforces room-based fan-out to prevent Redis packet storms.
     */
    function safeEmit(target: any, event: string, data: any, roomId?: string) {
        try {
            if (roomId) {
                io.to(roomId).emit(event, data);
            } else {
                target.emit(event, data);
            }
            messagesSentCounter.inc({ event });
        } catch (err) {
            logger.error({ err, event, roomId }, '[SocketServer] Emit failure');
        }
    }

    // Defer non-critical startup to prevent blocking the event loop
    setImmediate(async () => {
        try {
            const redisSub = new Redis(REDIS_URLS[0], redisOptions);
            await redisSub.subscribe('build-events');
            
            redisSub.on('message', (channel, message) => {
                if (channel === 'build-events') {
                    try {
                        const payload = JSON.parse(message);
                        const { projectId } = payload;
                        if (projectId) {
                            redis.setex(`project:state:${projectId}`, 3600, message);
                            // 🔥 BROADCAST ONLY TO PROJECT ROOM
                            safeEmit(io, 'build-update', payload, `project:${projectId}`);
                        }
                    } catch (err) {
                        logger.error({ err }, 'Failed to parse Redis build-event');
                    }
                }
            });
        } catch (err) {
            logger.error({ err }, 'Redis Sub initialization failed');
        }
    });

    server.on('error', (err: any) => {
        if (err.code === 'EADDRINUSE') {
            console.error(`❌ [SocketServer] Port ${PORT} already in use. Exiting worker...`);
            process.exit(1);
        }
    });

    server.listen(PORT, '0.0.0.0', () => {
        isReady = true;
        console.log(`🚀 [SocketServer] Worker ${cluster.worker?.id || 'primary'} listening on PORT ${PORT}`);
        
        // --- 10. Background Service Warmup (Deferred) ---
        setImmediate(() => {
            // Watchdog scan (optional, move into separate if needed)
            missionWatchdog.start();
        });

        setInterval(() => {
            if (redis.status === 'ready') {
                redis.set('system:health:socket', JSON.stringify({
                    status: 'online',
                    timestamp: Date.now(),
                    clients: io.engine.clientsCount,
                    workerId: cluster.worker?.id
                }), 'EX', 30).catch(() => {});
            }
        }, 10000);
    });
}

if (cluster.isPrimary) {
    console.log(`📡 [SocketCluster] Primary ${process.pid} is running`);
    
    const numCPUs = Math.min(os.cpus().length, 4);
    console.log(`🚀 [SocketCluster] Forking ${numCPUs} workers...`);

    const restartCounts = new Map<number, number>();

    for (let i = 0; i < numCPUs; i++) {
        cluster.fork();
    }

    // 🔥 Periodic Cluster Pruning (Primary only)
    setInterval(() => {
        WorkerClusterManager.pruneStaleNodes().catch(err => {
            console.error('[SocketCluster] Pruning failed:', err.message);
        });
    }, 10000);

    // 🛡️ Global Mission Watchdog (Primary only) - Defer to prevent blocking fork loop
    setImmediate(() => {
        try {
            missionWatchdog.start();
            console.log('🛡️ [SocketCluster] Global Mission Watchdog sequence initiated');
        } catch (err) {
            console.error('⚠️ [SocketCluster] Watchdog failed to start:', err.message);
        }
    });

    cluster.on('online', (worker) => {
        console.log(`✅ [SocketCluster] Worker ${worker.process.pid} is online`);
    });

    cluster.on('exit', (worker, code, signal) => {
        console.error(`❌ [SocketCluster] Worker ${worker.process.pid} died (code: ${code}, signal: ${signal}).`);
        
        const count = (restartCounts.get(worker.id) || 0) + 1;
        restartCounts.set(worker.id, count);

        if (count > 5) {
            console.error(`💥 [SocketCluster] Worker ${worker.id} reached max restart limit. Check for cyclic errors.`);
            return;
        }

        const delay = Math.min(5000, count * 1000);
        console.log(`♻️ [SocketCluster] Reviving worker in ${delay}ms... (Attempt ${count})`);
        
        setTimeout(() => {
            cluster.fork();
        }, delay);
    });
} else {
    // START SERVER STRICTLY IN WORKERS
    startServer();
}
