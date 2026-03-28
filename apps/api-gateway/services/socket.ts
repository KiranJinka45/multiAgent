import express from 'express';
import { createServer, request as httpRequest } from 'http';
import { Server } from 'socket.io';
import Redis from 'ioredis';
import { redis } from '@packages/shared-services';
import * as dotenv from 'dotenv';
import cors from 'cors';
import { logger, register } from '@packages/observability';
import { requestContext } from '../middleware/requestContext';
import { metricsMiddleware } from '../middleware/metricsMiddleware';
import { rateLimitMiddleware } from '../middleware/rateLimitMiddleware';

dotenv.config({ path: '.env.local' });

const app = express();

// Apply Observability & Resilience Middlewares
app.use(requestContext);
app.use(metricsMiddleware);
app.use(rateLimitMiddleware);
app.use(cors());

// Health & Metrics Endpoint
app.get('/metrics', async (req, res) => {
    try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch {
        res.status(500).end();
    }
});

// Global Debug Logger (Structured)
app.use((req, res, next) => {
    if (req.url.startsWith('/preview') || req.url === '/health') {
        logger.info({
            requestId: (req as express.Request & { requestId: string }).requestId,
            method: req.method,
            url: req.url,
        }, '[SocketServer] Request received');
    }
    next();
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
        console.error('[PreviewProxy] Redis Lookup Error:', err);
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
const redisSub = new Redis(REDIS_URLS[0]);

const PORT = parseInt(process.env.SOCKET_PORT || '3011');

// Health & Metrics Endpoint
app.get('/health', async (req, res) => {
    try {

        res.json({
            status: 'ok',
            uptime: process.uptime(),
            redis: redis.status,
            id: 'socket-server-v2'
        });
    } catch (error: unknown) {
        res.status(500).json({ status: 'error', error: error instanceof Error ? error.message : String(error) });
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
            const latestState = await redis.get(`project:state:${projectId}`);
            if (latestState) {
                socket.emit('build-update', JSON.parse(latestState));
                console.log(`[Socket.IO] Sent catch-up state to ${socket.id} for project ${projectId}`);
            }
        } catch (_error) {
            console.error('[Socket.IO] Catch-up error:', _error);
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
        } catch (_error) {
            console.error('[Socket.IO] Failed to parse Redis message:', _error);
        }
    }
});

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
