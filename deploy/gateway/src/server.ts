import 'dotenv/config';
import { env } from '@packages/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import http, { ClientRequest } from 'http';
import helmet from 'helmet';
import axios from 'axios';
import { logger, registry, initTelemetry } from '@packages/observability';
import { kafkaManager } from '@packages/events';
import { 
    rateLimitMiddleware, 
    createBreaker, 
    createBackpressureMiddleware, 
    createOutboundClient 
} from '@packages/resilience';
import { signInternalToken, internalAuth, userAuth } from '@packages/auth-internal';
import { requestContext } from './middleware/requestContext.js';
import { metricsMiddleware } from './middleware/metricsMiddleware.js';
import { initSocket } from './socket.js';
import { CostGovernanceService, QueueManager, onShutdown, createHealthRouter, createSecurityMiddleware, redis } from '@packages/utils';
import { z } from 'zod';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { db } from '@packages/db';
import https from 'https';
import fs from 'fs';
import { trackEvent } from './routes/events.js';
import { StripeService } from './services/stripe.js';
import resumeRouter from './routes/resume.js';

// --- RUNTIME INTEGRITY CHECK ---
import { config as backendConfig } from '@packages/config/backend';

export async function startGatewayServer() {
    console.log('✅ [RUNTIME CHECK] @packages/config/backend loaded successfully:', backendConfig !== undefined);

    // Standardized Outbound Clients
    const authClient = createOutboundClient({
        serviceName: 'auth-service',
        baseURL: `http://127.0.0.1:${env.AUTH_SERVICE_PORT}`,
        timeout: 5000,
        retries: 2
    });

    const billingClient = createOutboundClient({
        serviceName: 'billing-service',
        baseURL: process.env.BILLING_SERVICE_URL || 'http://127.0.0.1:4003',
        timeout: 5000,
        retries: 2
    });

    // Initialize telemetry as early as possible
    initTelemetry({
        serviceName: 'gateway',
        startMetricsServer: false,
    });


    const app = express();
    const PORT = env.GATEWAY_PORT;

    const JWT_SECRET = env.JWT_SECRET;

    // Service URLs - SRE Hardened: Internal Mesh uses HTTPS
    const ORCHESTRATOR_URL = env.CORE_ENGINE_URL?.replace('http://', 'https://');
    const AUTH_SERVICE_URL = `https://127.0.0.1:${env.AUTH_SERVICE_PORT}`;
    const BILLING_SERVICE_URL = (process.env.BILLING_SERVICE_URL || 'https://127.0.0.1:4003').replace('http://', 'https://');
    const CORE_API_URL = `https://127.0.0.1:${env.CORE_API_PORT}`;
    const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || 'internal-secret-456';


    // --- AUTH MIDDLEWARE ---
    const authenticate = userAuth({ allowDevBypass: true });

    const requireRole = (role: string) => (req: Request, res: Response, next: NextFunction) => {
        const authReq = req as any;
        if (!authReq.user || !authReq.user.roles.includes(role)) {
            logger.warn({ userId: authReq.user?.id, role }, 'Access denied: Insufficient permissions');
            return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
        }
        next();
    };

    // --- GOVERNANCE MIDDLEWARE ---
    const checkGovernance = async (req: Request, res: Response, next: NextFunction) => {
        const authReq = req as any;
        if (!authReq.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        try {
            if (await CostGovernanceService.isKillSwitchActive()) {
                return res.status(503).json({
                    error: 'Service temporarily unavailable due to maintenance',
                });
            }

            const { allowed, currentCount } =
                await CostGovernanceService.checkAndIncrementExecutionLimit(authReq.user.id);

            if (!allowed) {
                return res.status(403).json({
                    error: 'Daily generation limit reached',
                    currentCount,
                });
            }

            const { allowed: tokenAllowed } = await CostGovernanceService.checkTokenLimit(
                authReq.user.id
            );

            if (!tokenAllowed) {
                return res.status(403).json({ error: 'Monthly token budget exceeded' });
            }

            next();
        } catch (err) {
            logger.error({ err, userId: authReq.user.id }, 'Governance check failed');
            return res.status(500).json({ error: 'Governance validation failed' });
        }
    };

    // --- SCHEMAS ---
    const BuildRequestSchema = z.object({
        prompt: z.string().min(1),
        projectId: z.string().uuid(),
        executionId: z.string().uuid().optional(),
    });

    // --- PROXY DEFINITION ---
    const createServiceProxy = (target: string, basePath: string, rewriteTo: string = '') =>
        createProxyMiddleware({
            target,
            changeOrigin: true,
            pathRewrite: {
                [`^${basePath}`]: rewriteTo,
            },
            on: {
                proxyReq: (proxyReq, req: any) => {
                    // 🔥 Forward identity context
                    if (req.headers.authorization) {
                        proxyReq.setHeader('Authorization', req.headers.authorization);
                    }
                    
                    // 🔥 Inject service-to-service token
                    proxyReq.setHeader('x-internal-token', INTERNAL_TOKEN);
                },
                error: (err, req, res) => {
                    console.error('[Proxy Error]', err.message);
                    const response = res as Response;
                    if (!response.headersSent) {
                        response.status(502).json({ error: 'Bad Gateway', message: err.message });
                    }
                },
            },
        });

    // --- CORE MIDDLEWARE ---
    app.use(createSecurityMiddleware());
    app.use(cookieParser());
    app.use(requestContext);
    app.use(createBackpressureMiddleware({ baseConcurrentRequests: 500 }));
    app.use(rateLimitMiddleware);
    app.use(metricsMiddleware);

    // --- EDGE CDN CACHING SETTINGS ---
    app.use((req, res, next) => {
        if (req.method === 'GET' || req.method === 'HEAD') {
            // Private authenticated routes should never be cached at the edge
            if (req.path.startsWith('/api/') && req.headers.authorization) {
                res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
            } else if (req.path.startsWith('/public/') || req.path.startsWith('/assets/') || req.path === '/favicon.ico') {
                // Offload static and public data to Cloudflare/CDN aggressively
                res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400');
            } else {
                // Default secure posture
                res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
            }
        }
        next();
    });


    // Tracing Propagation Logger
    app.use((req, res, next) => {
        console.log(`🚥 [GATEWAY IN] ${req.method} ${req.url} (from: ${req.ip || 'unknown'})`);
        
        const traceparent = req.headers['traceparent'];
        if (traceparent) {
            logger.debug(
                {
                    requestId: (req as any).requestId,
                    traceparent,
                },
                '[Gateway] Incoming trace context detected'
            );
        }
        next();
    });

    // 5. WebSocket Tunnel (Dedicated Handshake Delegation)
    // MOVED EARLY: Must handle polling/upgrades before global REST auth/governance
    const wsProxy = createProxyMiddleware({
        target: ORCHESTRATOR_URL, // http://localhost:3002
        changeOrigin: true,
        ws: true,
        pathFilter: '/socket.io',
        on: {
            proxyReq: (proxyReq: any, req: any) => {
                // 🔥 Inject security token for the initial polling and upgrade handshake
                proxyReq.setHeader('x-internal-token', INTERNAL_TOKEN);
            },
            error: (err, req, res) => {
                logger.error({ err: err.message }, '[Gateway] WebSocket Proxy Error');
            }
        }
    });
    app.use(wsProxy);

    // --- ROUTES ---
    app.get(
        '/metrics',
        process.env.NODE_ENV === 'development'
            ? (_req, _res, next) => next()
            : internalAuth(['monitoring']),
        async (_req, res) => {
            try {
                res.set('Content-Type', registry.contentType);
                res.end(await registry.metrics());
            } catch {
                res.status(500).end();
            }
        }
    );

    // --- HEALTH & STATUS ---
    app.use(createHealthRouter({ 
        serviceName: 'gateway'
    }));


    // --- SERVICE BREAKERS (P16.5 Tuned) ---
    const breakerOptions = {
        timeout: 5000, // 5s max for production responsiveness
        errorThresholdPercentage: 50,
        resetTimeout: 10000,
        rollingCountTimeout: 10000,
        rollingCountBuckets: 10
    };

    const authBreaker = createBreaker(async (req: Request) => req, { 
        ...breakerOptions,
        name: 'auth-service'
    } as any);

    const billingBreaker = createBreaker(async (req: Request) => req, { 
        ...breakerOptions,
        name: 'billing-service' 
    } as any);

    const coreApiBreaker = createBreaker(async (req: Request) => req, { 
        ...breakerOptions,
        name: 'core-api' 
    } as any);

    const breakerMiddleware = (breaker: any) => async (req: Request, res: Response, next: NextFunction) => {
        if (breaker.opened) {
            logger.warn({ service: breaker.name }, '[Gateway] Circuit Open - Short-circuiting request');
            return res.status(503).json({
                error: 'Service temporarily unavailable (Circuit Open)',
                service: breaker.name,
                code: 'SERVICE_DEGRADED'
            });
        }
        next();
    };

    // Circuit Breaker for Stripe
    const stripeBreaker = createBreaker(
        async (_payload: any) => {
            return { success: true, transactionId: `txn_${Date.now()}` };
        },
        {
            timeout: 10000,
            errorThresholdPercentage: 50,
            resetTimeout: 30000,
        }
    );

    app.post('/api/checkout', express.json(), async (req, res) => {
        try {
            const result = await stripeBreaker.fire(req.body);
            res.json(result);
        } catch (err) {
            logger.error({ err }, '[Gateway] Checkout Failed / Circuit Open');
            res.status(503).json({
                error: 'Payment service temporarily unavailable. Please try again later.',
                code: 'SERVICE_UNAVAILABLE',
            });
        }
    });

    // --- SERVICE PROXIES (Path Preservation Phase) ---

    // Global Proxy Configuration
    const proxyOptions = {
        changeOrigin: true,
        ws: true, 
        proxyTimeout: 10000, 
        timeout: 10000,
        secure: false, // Internal self-signed certs handled by agent
        agent: new https.Agent({
            rejectUnauthorized: false // In prod, this would trust the specific internal CA
        }),
        onProxyReq: (proxyReq: any, req: any) => {
            proxyReq.setHeader('x-internal-token', env.INTERNAL_SERVICE_TOKEN);
            if (req.headers.authorization) {
                proxyReq.setHeader('authorization', req.headers.authorization);
            }
        }
    };

    // 1. Auth Service
    app.use(createProxyMiddleware({ 
        ...proxyOptions,
        target: AUTH_SERVICE_URL, 
        pathFilter: '/api/auth'
    }));

    // 2. Billing Service
    app.use(authenticate, createProxyMiddleware({ 
        ...proxyOptions,
        target: BILLING_SERVICE_URL, 
        pathFilter: '/api/billing'
    }));

    // 3. Orchestrator (Builds)
    app.use(authenticate, checkGovernance, createProxyMiddleware({ 
        ...proxyOptions,
        target: ORCHESTRATOR_URL, 
        pathFilter: '/api/builds'
    }));

    // 4. Business BFF (Catch-all for Agents, Missions, Logs, System)
    app.use(authenticate, createProxyMiddleware({ 
        ...proxyOptions,
        target: CORE_API_URL, 
        pathFilter: (path) => path.startsWith('/api/agents') || path.startsWith('/api/missions') || path.startsWith('/api/logs') || path.startsWith('/api/system')
    }));

    // --- RESUME & SYSTEM ---

    // Resume
    app.use('/api/resume', resumeRouter);

    // Event Tracking
    app.post(
        '/api/events',
        express.json(),
        (_req: Request, _res: Response, next: NextFunction) => next(),
        trackEvent as (req: Request, res: Response) => Promise<void>
    );

    // Stripe Checkout
    app.post('/api/checkout', express.json(), authenticate, async (req: Request, res: Response) => {
        const { productId } = req.body;
        const authReq = req as any;

        if (!authReq.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }

        try {
            await db.event.create({
                data: {
                    name: 'conversion_started',
                    userId: authReq.user.id,
                    tenantId: authReq.user.tenantId,
                    payload: { productId },
                },
            });

            const url = await StripeService.createCheckoutSession(
                authReq.user.id,
                authReq.user.tenantId,
                productId
            );

            res.json({ url });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            res.status(500).json({ error: message });
        }
    });

    // Stripe Webhook
    app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req, res) => {
        const sig = req.headers['stripe-signature'] as string;

        try {
            const event = await StripeService.constructEvent(req.body, sig);

            if (event.type === 'checkout.session.completed') {
                await QueueManager.add('billing-events', {
                    type: 'subscription_created',
                    data: event.data.object,
                });
            }

            res.json({ received: true });
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : String(err);
            res.status(400).send(message);
        }
    });

    const certPath = '/etc/tls/tls.crt';
    const keyPath = '/etc/tls/tls.key';
    const useHttps = fs.existsSync(certPath) && fs.existsSync(keyPath);

    const server = useHttps
        ? https.createServer({
            cert: fs.readFileSync(certPath),
            key: fs.readFileSync(keyPath),
          }, app)
        : http.createServer(app);

    // --- TOP-LEVEL HANDSHAKE DELEGATION ---
    server.on('upgrade', (req, socket, head) => {
        if (req.url?.startsWith('/socket.io')) {
            logger.info({ url: req.url }, '[Gateway] Intercepting WebSocket upgrade');
            wsProxy.upgrade(req, socket as any, head);
        }
    });

    // --- WARM STARTUP STRATEGY ---
    const preloadModules = async () => {
        logger.info('[Gateway] Preloading critical modules...');
        await Promise.all([
            import('@packages/db'),
            import('@packages/memory-cache'),
            import('@packages/utils'),
        ]);
        logger.info('[Gateway] Warm startup complete');
    };

    server.listen(PORT, '0.0.0.0', 2048, async () => {
        await preloadModules();
        logger.info({ port: PORT, pid: process.pid }, '[Gateway] Production BFF Worker operational');

        // Register Graceful Shutdown Tasks
        onShutdown('HTTP Server', () => new Promise(resolve => server.close(() => resolve())));
        onShutdown('Kafka Manager', () => kafkaManager.shutdown());
    });

    server.on('error', (err) => {
        logger.error({ err }, '🚨 [Gateway] FATAL SERVER ERROR');
        console.error('SERVER ERROR:', err);
    });

    process.on('uncaughtException', (err) => {
        console.error('🚨 UNCAUGHT EXCEPTION:', err);
    });

    process.on('unhandledRejection', (reason, promise) => {
        console.error('🚨 UNHANDLED REJECTION:', reason);
    });
}
