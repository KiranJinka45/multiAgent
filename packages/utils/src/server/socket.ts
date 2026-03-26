import express from 'express';
import { createServer, request as httpRequest } from 'http';
import { Server } from 'socket.io';
import Redis from 'ioredis';
import { redis } from './redis';
import dotenv from 'dotenv';
import cors from 'cors';
import { registry, apiRequestDurationSeconds } from '../config/metrics';
import { logger } from '@libs/observability';
import { runWithTracing, getCorrelationId } from './tracing';
import { ReliabilityMonitor } from './reliability-monitor';
import { createLazyProxy } from './runtime';

dotenv.config({ path: '.env.local' });

const app = express();
app.use(cors());

// Tracing & Logging Middleware
app.use((req, res, next) => {
    const correlationId = (req.headers['x-correlation-id'] as string) || req.query.correlationId as string;
    
    runWithTracing(correlationId, () => {
        // Log every incoming request
        logger.info({ 
            method: req.method, 
            url: req.url, 
            correlationId: getCorrelationId() 
        }, `[SocketServer] Incoming request`);
        next();
    });
});

// Health & Metrics Endpoint (Move to top for reliability)
app.get('/health', (req, res) => {
    res.json({
        status: 'ok',
        uptime: process.uptime(),
        redis: redis.status,
        id: 'socket-server-v2'
    });
});

app.get('/metrics', async (req, res) => {
    try {
        console.log('[SocketServer] Serving /metrics');
        res.set('Content-Type', registry.contentType);
        res.end(await registry.metrics());
    } catch (err) {
        console.error('[SocketServer] Metrics Error:', err);
        res.status(500).end(String(err));
    }
});

// --- Preview Proxy ---
// Routes http://localhost:3005/preview/{projectId}/* -> http://localhost:{port}/*
app.use('/preview', (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const parts = req.url.split('/').filter(Boolean);
    const projectId = parts[0];
    
    if (!projectId) {
        return next();
    }

    console.log(`[PreviewProxy] [${req.method}] ${req.url} -> Project: ${projectId}`);
    
    redis.get(`preview:port:${projectId}`).then(port => {
        if (!port) {
            console.warn(`[PreviewProxy] 404 - No port found for ${projectId}`);
            return res.status(404).json({ error: 'Preview not found or expired', projectId });
        }

        // Track last access time for idle shutdown
        redis.set(`preview:last_access:${projectId}`, Date.now().toString(), 'EX', 86400); // 1 day TTL
        
        const targetPort = parseInt(port);
        // Stripping project ID from path for internal routing
        const internalPath = req.url.replace(`/${projectId}`, '') || '/';

        console.log(`[PreviewProxy] Forwarding to http://127.0.0.1:${targetPort}${internalPath}`);

        const options = {
            hostname: '127.0.0.1', // Use explicit IPv4 for Windows stability
            port: targetPort,
            path: internalPath,
            method: req.method,
            headers: {
                ...req.headers,
                host: `127.0.0.1:${targetPort}`
            }
        };

        const proxyReq = httpRequest(options, (proxyRes) => {
            console.log(`[PreviewProxy] Target Response: ${proxyRes.statusCode}`);
            res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
            proxyRes.pipe(res);
        });

        proxyReq.on('error', (err) => {
            console.error(`[PreviewProxy] Connection failure to ${projectId}:`, err.message);
            if (!res.headersSent) {
                res.status(502).send('Gateway Error: Isolated preview server unreachable');
            }
        });

        req.pipe(proxyReq);
        }).catch(err => {
            ReliabilityMonitor.recordError({
                service: 'socket-server',
                error: err.message,
                context: { projectId, url: req.url },
                timestamp: new Date().toISOString()
            });
            if (!res.headersSent) res.status(500).send('Proxy State Error');
        });
});


const server = createServer(app);
const io = new Server(server, {
    cors: {
        origin: '*',
        methods: ['GET', 'POST']
    },
    transports: ['websocket', 'polling']
});

const REDIS_URLS = process.env.REDIS_URLS ? process.env.REDIS_URLS.split(',') : [process.env.REDIS_URL || 'redis://localhost:6379'];
const redisSub = createLazyProxy(() => new Redis(REDIS_URLS[0]), 'Redis_Sub');

const PORT = parseInt(process.env.SOCKET_PORT || '3011');

// Metrics Middleware
app.use((req, res, next) => {
    const end = apiRequestDurationSeconds.startTimer();
    res.on('finish', () => {
        end({
            method: req.method,
            route: req.path,
            status_code: res.statusCode.toString(),
        });
    });
    next();
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
            const latestState = await redis.get(`project:state:${projectId}`);
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
            const { projectId } = payload;

            if (projectId) {
                // Cache the latest state for this project to enable instant catch-up for new listeners
                redis.setex(`project:state:${projectId}`, 3600, message); // TTL 1 hour

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

// Only start the server if not in Next.js build phase
if (process.env.NEXT_PHASE !== 'phase-production-build' && process.env.NEXT_PHASE !== 'phase-export') {
    server.listen(PORT, '0.0.0.0', () => {
        console.log(`[Socket.IO] Realtime server running on http://localhost:${PORT}`);
        
        // Periodically update health status in Redis
        setInterval(() => {
            redis.set('system:health:socket', JSON.stringify({
                status: 'online',
                timestamp: Date.now(),
                clients: io.engine.clientsCount
            }), 'EX', 30);
        }, 10000);
    });
} else {
    console.log(`[Socket.IO] Skipping server listen during build phase (${process.env.NEXT_PHASE})`);
}

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    ReliabilityMonitor.recordError({
        service: 'socket-server',
        error: err.message,
        stack: err.stack,
        context: { url: req.url, method: req.method },
        timestamp: new Date().toISOString()
    });

    if (!res.headersSent) {
        res.status(500).json({ 
            error: 'Internal Server Error', 
            correlationId: getCorrelationId() 
        });
    }
});
