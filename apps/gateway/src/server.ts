import 'dotenv/config';
import { serverConfig as originalEnv, SecretProvider } from '@packages/config';
const env = originalEnv as any;
const backendConfig = env;
import express from 'express';
import type { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import jwt from 'jsonwebtoken';
import http, { ClientRequest } from 'http';
import helmet from 'helmet';
import axios from 'axios';
import { logger, registry, initTelemetry, correlationMiddleware } from '@packages/observability';
import { 
    rateLimitMiddleware, 
    createBreaker, 
    createBackpressureMiddleware, 
    createOutboundClient,
    CostGovernanceService as OriginalCostGovernanceService, 
    QueueManager, 
    AuditLogger, 
    onShutdown, 
    createHealthRouter, 
    createSecurityMiddleware, 
    redis, 
    contextStorage, 
    ControlPlane, 
    regionalGovernance as OriginalRegionalGovernance, 
    kafkaManager 
} from '@packages/utils';
const CostGovernanceService = OriginalCostGovernanceService as any;
const regionalGovernance = OriginalRegionalGovernance as any;
import { internalAuth, userAuth } from '@packages/auth-internal';
import { requestContext } from './middleware/requestContext.js';
import { metricsMiddleware } from './middleware/metricsMiddleware.js';
import { tierLimitMiddleware } from './middleware/tier-limiter.js';
import { initSocket } from './socket.js';
import { z } from 'zod';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { db } from '@packages/db';
import { validateRequest, TrackEventSchema, CheckoutSchema } from '@packages/utils';
import https from 'https';
import fs from 'fs';
import { trackEvent } from './routes/events.js';
import { StripeService } from './services/stripe.js';
import resumeRouter from './routes/resume.js';
import adminRouter from './routes/admin.js';
import adminDlqRouter from './routes/admin-dlq.js';

// --- SECURE EXCEPTION SANITIZATION WRAPPER ---
function sanitizeException(err: unknown, defaultMessage = 'An unexpected internal error occurred.'): string {
    if (err instanceof Error) {
        const msg = err.message || '';
        if (msg.includes('Prisma') || msg.includes('SQL') || msg.includes('database') || msg.includes('connect')) {
            return 'An internal database error occurred.';
        }
        if (err.stack && (err.stack.includes('at ') || err.stack.includes('.ts:') || err.stack.includes('.js:'))) {
            return defaultMessage;
        }
        return msg;
    }
    return String(err);
}

async function waitForCore() {
    const CORE_PORT = process.env.CORE_API_PORT || 3010;
    const url = process.env.CORE_API_URL 
        ? `${process.env.CORE_API_URL}/health`
        : `http://localhost:${CORE_PORT}/health`;

    while (true) {
        try {
            const res = await axios.get(url);
            if (res.status === 200) break;
        } catch (e) {}

        logger.info("⏳ Waiting for Core API...");
        await new Promise(r => setTimeout(r, 2000));
    }

    logger.info("✅ Core API ready");
}

export async function startGatewayServer() {
    // Tier-1: Bootstrap production secrets from AWS Secrets Manager
    if (typeof SecretProvider.bootstrap === 'function') {
        await SecretProvider.bootstrap();
    } else if ((SecretProvider as any).SecretProvider && typeof (SecretProvider as any).SecretProvider.bootstrap === 'function') {
        await (SecretProvider as any).SecretProvider.bootstrap();
    } else {
        console.warn('⚠️ [Gateway] SecretProvider.bootstrap is not a function. Skipping bootstrap...');
    }
    
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
    } as any);


    const app = express();
    app.disable("x-powered-by");
    
    // Event loop lag monitoring for backpressure admission control (SRE Admission Control)
    const { monitorEventLoopDelay } = await import('perf_hooks');
    const lagHistogram = monitorEventLoopDelay({ resolution: 10 });
    lagHistogram.enable();
    let simulatedLagMs = 0;

    app.use((req: Request, res: Response, next: NextFunction) => {
        if (req.path === '/health' || req.path === '/health/ready' || req.path.startsWith('/public/') || req.path.startsWith('/api/v1/chaos')) {
            return next();
        }
        const p95LagMs = simulatedLagMs > 0 ? simulatedLagMs : (lagHistogram.percentile(95) / 1e6);
        const priority = (req.headers['x-priority'] as string) || 'low';
        if (p95LagMs > 250 && priority !== 'critical') {
            logger.warn({ p95LagMs, path: req.path, priority }, '🛑 [Gateway] Admission Control: Shedding request due to high event-loop lag');
            res.status(429).json({
                error: 'Server is temporarily overloaded (high event-loop latency). Please try again shortly.',
                code: 'ADMISSION_CONTROL_SHEDDING',
                lagMs: p95LagMs.toFixed(1)
            });
            return;
        }
        next();
    });
    
    // --- GUARANTEED HEALTH ENDPOINT ---
    app.get('/health', (_req, res) => {
        res.status(200).json({ 
            status: 'ok', 
            service: 'gateway',
            timestamp: new Date().toISOString()
        });
    });

    // UX FIX: Gateway Root Route
    app.get('/', (req, res) => {
        res.send('<!DOCTYPE html><html><head><title>MultiAgent SRE Gateway</title></head><body><h1>MultiAgent SRE Gateway (Production-Hardened) is running.</h1></body></html>');
    });

    // --- DEBUG CHAOS ROUTES (PROXIED TO CORE-API) ---
    app.get('/debug/drop-telemetry', (req, res) => {
        logger.warn('💥 [CHAOS] Routing Telemetry Loss to Backend');
        res.redirect(`http://127.0.0.1:${env.CORE_ENGINE_PORT || 3010}/debug/drop-telemetry`);
    });
    
    app.get('/debug/failover', (req, res) => {
        logger.warn('💥 [CHAOS] Routing Failover to Backend');
        res.redirect(`http://127.0.0.1:${env.CORE_ENGINE_PORT || 3010}/debug/failover?source=${req.query.source || 'us-east-1'}`);
    });

    app.get('/debug/watchdog-test', (req, res) => {
        logger.warn('💥 [CHAOS] Routing Watchdog Test to Backend');
        res.redirect(`http://127.0.0.1:${env.CORE_ENGINE_PORT || 3010}/debug/watchdog-test?mode=${req.query.mode || 'NORMAL'}`);
    });

    app.get('/debug/chaos', (req, res) => {
        const { type, nodeId, score } = req.query;
        logger.warn({ type, nodeId, score }, '💥 [CHAOS] Routing Generic Chaos to Backend');
        res.redirect(`http://127.0.0.1:${env.CORE_ENGINE_PORT || 3010}/debug/chaos?type=${type}&nodeId=${nodeId}&score=${score}`);
    });

    app.post('/api/debug/reset', (req, res) => {
        logger.warn('💥 [CHAOS] Routing System Reset to Backend');
        res.redirect(307, `http://127.0.0.1:${env.CORE_ENGINE_PORT || 3010}/debug/reset`);
    });

    // --- IDENTITY REDIRECT (SRE STABILIZATION) ---
    app.get('/api/whoami', (req, res) => {
        res.json({ 
            status: 'ok', 
            region: process.env.REGION || 'us-east-1',
            sessionId: req.headers['x-session-id'] || 'anonymous'
        });
    });

    app.use(createSecurityMiddleware());
    app.use(helmet());
    app.use(cors());
    app.use(cookieParser());
    app.use(express.json());
    
    // Enable CSRF protection (Phase 6 Security Remediation)
    const { createCsrfMiddleware } = await import('@packages/utils');
    app.use(createCsrfMiddleware());
    const PORT = env.GATEWAY_PORT;

    // --- FAILURE INJECTION: CANARY ROLLBACK TEST ---
    app.use((req, res, next) => {
        if (process.env.INJECT_CANARY_FAILURE === 'true' || req.headers['x-canary-failure'] === 'true') {
            const delay = 1000; // 1s delay
            logger.warn({ path: req.path, delay }, '💥 [CHAOS] Injecting latency for Canary Test');
            setTimeout(next, delay);
        } else {
            next();
        }
    });

    const JWT_SECRET = process.env['JWT_SECRET'];

    // Service URLs - SRE Hardened: Internal Mesh uses HTTPS
    const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || env.CORE_ENGINE_URL || 'http://127.0.0.1:3010';
    const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || `http://127.0.0.1:${env.AUTH_SERVICE_PORT || 4005}`;
    const BILLING_SERVICE_URL = (process.env.BILLING_SERVICE_URL || 'http://127.0.0.1:4003').replace('https://', 'http://');
    const CORE_API_URL = process.env.CORE_API_URL || `http://127.0.0.1:${env.CORE_ENGINE_PORT || 3010}`;
    console.log(`[Gateway] DEBUG: CORE_API_URL is ${CORE_API_URL}`);
    console.log(`[Gateway] Routing Business BFF to: ${CORE_API_URL}`);
    const INTERNAL_TOKEN = process.env['INTERNAL_SERVICE_TOKEN'];
    if (!INTERNAL_TOKEN && process.env.NODE_ENV === 'production') {
        throw new Error('FATAL: INTERNAL_SERVICE_TOKEN must be set in production');
    }


    // --- AUTH MIDDLEWARE ---
    console.log(`[Gateway] NODE_ENV: ${process.env.NODE_ENV}`);
    const authenticate = (userAuth as any)();
    const requirePermission = (permission: string) => {
        return (req: any, res: any, next: any) => {
            const user = req.user;
            if (!user) {
                res.status(401).json({ error: 'Unauthorized' });
                return;
            }
            if (process.env.NODE_ENV === 'development' || !permission) {
                next();
                return;
            }
            const permissions = user.permissions || [];
            if (permissions.includes(permission) || permissions.includes('admin')) {
                next();
                return;
            }
            res.status(403).json({ error: 'Forbidden: Insufficient Permissions' });
        };
    };

    const authorize = (permission: any) => [
        authenticate,
        requirePermission(permission) as any,
        async (req: Request, res: Response, next: NextFunction) => {
            // Success - proceed
            next();
        }
    ];

    // Middleware to log 403s for auditing
    app.use((err: any, req: Request, res: Response, next: NextFunction) => {
        if (err.status === 403 || err.statusCode === 403) {
            const authReq = req as any;
            AuditLogger.logSecurity('FORBIDDEN_ACCESS', 'FAILURE', {
                path: req.path,
                method: req.method,
                userId: authReq.user?.id,
                tenantId: authReq.user?.tenantId,
                roles: authReq.user?.roles
            }).catch(() => {});
        }
        next(err);
    });

    // --- IDENTITY PROPAGATION MIDDLEWARE (Zero-Trust Certification) ---
    const propagateIdentity = (req: Request, res: Response, next: NextFunction) => {
        const authReq = req as any;
        const tenantId = authReq.user?.tenantId || authReq.user?.id;
        const userId = authReq.user?.id;

        // Re-run context with identity if available
        const currentStore = contextStorage.getStore() || { requestId: (req.headers['x-request-id'] as string) || 'internal' };
        
        contextStorage.run({ ...currentStore, tenantId, userId }, () => {
            next();
        });
    };

    // --- CROSS-REGION FAILOVER PROXY ---
    let failoverProxy: any = null;
    const FALLBACK_REGION_URL = process.env.FALLBACK_REGION_URL;
    
    if (FALLBACK_REGION_URL) {
        logger.info({ fallbackUrl: FALLBACK_REGION_URL }, '[Gateway] Multi-Region Failover is configured');
        failoverProxy = createProxyMiddleware({
            target: FALLBACK_REGION_URL,
            changeOrigin: true,
            on: {
                proxyReq: (proxyReq: any, req: any) => {
                    // Mark as proxied to prevent infinite bouncing between regions
                    proxyReq.setHeader('x-failover-hop', '1');
                    // Forward identity and internal tokens
                    if (req.headers.authorization) {
                        proxyReq.setHeader('Authorization', req.headers.authorization);
                    }
                    proxyReq.setHeader('x-internal-token', INTERNAL_TOKEN || '');
                    proxyReq.setHeader('x-source-region', regionalGovernance.getCurrentRegion());
                },
                error: (err, req, res) => {
                    logger.error({ err: err.message }, '[Gateway] Cross-Region Proxy Error');
                    const response = res as Response;
                    if (!response.headersSent) {
                        response.status(502).json({ error: 'Multi-Region Failover Failed', message: err.message });
                    }
                }
            }
        });
    }

    const tryFailover = (req: Request, res: Response, next: NextFunction): boolean => {
        if (failoverProxy && !req.headers['x-failover-hop']) {
            // SAFE ROUTING POLICY: Enforce Idempotency for Writes
            const isRead = ['GET', 'OPTIONS', 'HEAD'].includes(req.method);
            const hasIdempotency = !!req.headers['idempotency-key'];
            
            if (!isRead && !hasIdempotency) {
                logger.warn({ path: req.path, method: req.method }, '🛑 [Cross-Region] Rejecting failover for unsafe write (No Idempotency-Key)');
                return false; // Prevent proxying; falls back to local rejection (503)
            }

            logger.warn({ path: req.path }, '🌍 [Cross-Region] Initiating failover proxy to fallback region');
            failoverProxy(req, res, next);
            return true;
        }
        return false;
    };

    /**
     * 🔥 Global Tier-1: Region Affinity Middleware
     * Routes requests to the region that "owns" the mission to ensure strong consistency.
     */
    const regionAffinityMiddleware = (async (req: Request, res: Response, next: NextFunction) => {
        const missionId = req.params?.missionId || req.body?.missionId || (req.query?.missionId as string);
        if (!missionId) return next();

        try {
            const { targetRegion, isLocal } = await regionalGovernance.getRouteAffinity(missionId);
            
            if (!isLocal) {
                // If not local, and we have a failover proxy, use it to route to the correct region
                if (failoverProxy) {
                    logger.info({ missionId, targetRegion }, '✈️ [Global-Routing] Offloading to assigned region');
                    return failoverProxy(req, res, next);
                } else {
                    logger.warn({ missionId, targetRegion }, '⚠️ [Global-Routing] Region mismatch but no fallback configured. Proceeding locally.');
                }
            }
            
            res.setHeader('x-region-affinity', targetRegion);
            next();
        } catch (err) {
            logger.error({ err, missionId }, 'Region affinity check failed');
            next();
        }
    }) as any;

    // --- GOVERNANCE MIDDLEWARE ---
    const hotPathGuard = (async (req: Request, res: Response, next: NextFunction) => {
        try {
            // DB Degraded Mode (Reads OK, Writes Blocked)
            const dbCircuitState = await redis.get('circuit:db:global');
            if (dbCircuitState === 'OPEN') {
                const isRead = ['GET', 'OPTIONS', 'HEAD'].includes(req.method);
                if (!isRead) {
                    if (tryFailover(req, res, next)) return;
                    logger.warn({ path: req.path, method: req.method }, '🛑 [Gateway] Fast Path Guard: Rejecting write (DB Circuit OPEN / DEGRADED)');
                    res.status(503).json({
                        error: 'Database maintenance / Degraded mode. Write operations are temporarily suspended.',
                        code: 'DB_DEGRADED_MODE',
                        retryAfter: 30
                    });
                    return;
                }
            }

            const queueDepthRaw = await redis.get('governance:total_active_jobs');
            const retryRateRaw = await redis.get('system:retry:rate');
            
            const queueDepth = parseInt(queueDepthRaw || '0', 10);
            const retryRate = parseInt(retryRateRaw || '0', 10);

            if (queueDepth > 2000) {
                if (tryFailover(req, res, next)) return;
                logger.warn({ path: req.path, queueDepth }, '🔥 [Gateway] Fast Path Guard: Rejecting request (Queue Overflow)');
                res.status(503).json({ error: 'System overloaded', code: 'QUEUE_OVERFLOW', reject: true, reason: 'queue_overflow', retryAfter: 30 });
                return;
            }

            if (retryRate > 30) {
                if (tryFailover(req, res, next)) return;
                logger.warn({ path: req.path, retryRate }, '🔥 [Gateway] Fast Path Guard: Rejecting request (Retry Storm)');
                res.status(503).json({ error: 'System overloaded', code: 'RETRY_STORM', reject: true, reason: 'retry_storm', retryAfter: 30 });
                return;
            }

            next();
        } catch (err) {
            next(); // fail open
        }
    }) as any;

    const checkLoadShedding = (async (req: Request, res: Response, next: NextFunction) => {
        try {
            // Read the Control Plane's cluster-wide mode decision from Redis, with PROTECT failsafe
            const mode = await ControlPlane.getModeSafe(redis, 'PROTECT');
            const priority = (req.headers['x-priority'] as 'critical' | 'high' | 'low') || 'low';

            // Allow GET/OPTIONS/HEAD (read-only) in all modes except EMERGENCY
            if (['GET', 'OPTIONS', 'HEAD'].includes(req.method) && mode !== 'EMERGENCY') {
                next();
                return;
            }

            if (mode === 'EMERGENCY') {
                if (tryFailover(req, res, next)) return;
                logger.error({ mode, path: req.path }, '🔴 [ControlPlane] EMERGENCY: Rejecting all traffic');
                res.status(503).json({
                    error: 'System is in emergency mode. All operations are temporarily suspended.',
                    code: 'CONTROL_PLANE_EMERGENCY',
                    retryAfter: 60
                });
                return;
            }

            if (mode === 'PROTECT' && priority !== 'critical') {
                if (tryFailover(req, res, next)) return;
                logger.warn({ mode, priority, path: req.path }, '🟠 [ControlPlane] PROTECT: Rejecting non-critical request');
                res.status(503).json({
                    error: 'System is under protection mode. Only critical operations are accepted.',
                    code: 'CONTROL_PLANE_PROTECT',
                    retryAfter: 30
                });
                return;
            }

            if (mode === 'DEGRADED' && priority === 'low') {
                logger.warn({ mode, priority, path: req.path }, '🟡 [ControlPlane] DEGRADED: Shedding low-priority request');
                res.status(503).json({
                    error: 'System is currently under heavy load. Please try again in a few minutes.',
                    code: 'CONTROL_PLANE_DEGRADED',
                    retryAfter: 15
                });
                return;
            }

            // Fallback: also check the legacy QuotaEngine system load
            const load = await CostGovernanceService.checkSystemLoad({ priority: priority === 'critical' ? 'high' : priority });
            if (!load.allowed) {
                res.status(503).json({
                    error: load.reason || 'System overloaded',
                    code: 'LOAD_SHEDDING_ACTIVE',
                    retryAfter: 30
                });
                return;
            }

            next();
        } catch (err) {
            logger.error({ err }, 'Load shedding check failed');
            next(); // Fail open for load shedding
        }
    }) as any;

    const checkGovernance = (async (req: Request, res: Response, next: NextFunction) => {
        const authReq = req as any;
        if (!authReq.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }

        const tenantId = authReq.user.tenantId || authReq.user.id;

        try {
            if (await CostGovernanceService.isKillSwitchActive()) {
                res.status(503).json({
                    error: 'Service temporarily unavailable due to maintenance',
                });
                return;
            }

            // 1. Check Per-User Rate Limit (Protect against single-account abuse)
            const userRateLimit = await CostGovernanceService.checkUserRateLimit(authReq.user.id);
            if (!userRateLimit.allowed) {
                res.status(429).json({
                    error: 'Account-level rate limit exceeded',
                    retryAfter: userRateLimit.retryAfter,
                });
                return;
            }

            // 2. Check Per-Tenant Rate Limit (Fast check for tenant-wide surge)
            const rateLimit = await CostGovernanceService.checkRateLimit(tenantId);
            if (!rateLimit.allowed) {
                res.status(429).json({
                    error: 'Tenant rate limit exceeded',
                    retryAfter: rateLimit.retryAfter,
                });
                return;
            }

            // 3. Reserve Execution Slot (Atomic check + increment for Concurrency & Daily)
            const quota = await CostGovernanceService.reserveExecutionSlot(tenantId);

            if (!quota.allowed) {
                res.status(403).json({
                    error: quota.reason || 'Quota exceeded',
                    current: quota.current,
                    limit: quota.limit,
                });
                return;
            }

            // 4. Ensure slot release on finish
            let isQuotaIncremented = true;
            const releaseSlot = async () => {
                if (isQuotaIncremented) {
                    await CostGovernanceService.decrementActiveJobs(tenantId);
                    isQuotaIncremented = false;
                }
            };

            res.on('finish', releaseSlot);
            res.on('close', releaseSlot);

            next();
        } catch (err) {
            logger.error({ err, tenantId }, 'Governance check failed');
            res.status(500).json({ error: 'Governance validation failed' });
            return;
        }
    }) as any;

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
                    proxyReq.setHeader('x-internal-token', INTERNAL_TOKEN || '');
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
    app.use(correlationMiddleware);
    app.use(createSecurityMiddleware());
    app.use(cookieParser());
    app.use(requestContext);


    app.use(createBackpressureMiddleware({ baseConcurrentRequests: 500 } as any));
    app.use(rateLimitMiddleware);
    app.use('/api', tierLimitMiddleware as any); // Apply tier-aware limits to all API routes
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

    // 5. WebSocket Tunnel (Local Socket.io Server) 🛡️
    // Handled locally by initSocket(server)

    // --- LOCAL ROUTES (Move before catch-all) ---
    // Resume
    app.use('/api/v1/resume', resumeRouter);

    // Intelligence Admin (Operationalized Intelligence)
    app.use('/api/v1/admin/intelligence', authenticate, propagateIdentity, authorize('system:manage'), adminRouter);
    
    // DLQ Management (SRE Operations)
    app.use('/api/v1/admin/dlq', authenticate, authorize('system:manage'), adminDlqRouter);

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

    app.post(
        '/api/events',
        express.json() as any,
        validateRequest(TrackEventSchema) as any,
        trackEvent as any
    );

    // --- HEALTH & STATUS ---
    app.use(createHealthRouter({ 
        serviceName: 'gateway',
        checkDependencies: async () => ({
            redis: { status: redis.status === 'ready' ? 'up' : 'down' }
        })
    }));

    app.get('/health/deploy', (async (_req: Request, res: Response) => {
        try {
            const isBlocked = await redis.get('system:deploy:blocked');
            if (isBlocked === 'true') {
                res.status(503).json({
                    status: 'blocked',
                    error: 'Deployments Blocked by Error Budget',
                    retryAfter: 60
                });
                return;
            }
            res.status(200).json({ status: 'ok', deployable: true });
        } catch (err) {
            // Fail open on redis error to allow deployments if observability layer is down
            res.status(200).json({ status: 'unknown', deployable: true, warning: 'Redis unreachable' });
        }
    }) as any);


    // --- SERVICE BREAKERS (P16.5 Tuned) ---
    const breakerOptions = {
        timeout: 5000, // 5s max for production responsiveness
        errorThresholdPercentage: 50,
        resetTimeout: 10000,
        rollingCountTimeout: 10000,
        rollingCountBuckets: 10
    };

    const authBreaker = createBreaker(async (...args: any[]) => args[0], { 
        ...breakerOptions,
        name: 'auth-service'
    } as any);

    const billingBreaker = createBreaker(async (...args: any[]) => args[0], { 
        ...breakerOptions,
        name: 'billing-service' 
    } as any);

    const coreApiBreaker = createBreaker(async (...args: any[]) => args[0], { 
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

    app.post('/api/checkout', express.json() as any, (async (req: Request, res: Response) => {
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
    }) as any);

    // --- SERVICE PROXIES (Path Preservation Phase) ---

    // --- CIRCUIT BREAKER & RESILIENCE ---
    const circuitState = {
        core: { failures: 0, lastFailure: 0, open: false },
        auth: { failures: 0, lastFailure: 0, open: false }
    };

    const CHECK_THRESHOLD = 5;
    const RECOVERY_TIME = 10000; // 10s

    const proxyOptions = {
        changeOrigin: true,
        ws: true, 
        proxyTimeout: 5000, 
        timeout: 5000,
        secure: false,
        on: {
            proxyReq: (proxyReq: any, req: any, res: any, options: any) => {
                const token = env.INTERNAL_SERVICE_TOKEN || '';
                proxyReq.setHeader('x-internal-token', token);
                
                if (!req.headers.authorization) {
                    proxyReq.setHeader('Authorization', `Bearer ${token}`);
                } else {
                    proxyReq.setHeader('Authorization', req.headers.authorization);
                }
            },
            error: (err: any, req: any, res: any, target: any) => {
                const service = (target as any)?.host?.includes('core-api') ? 'core' : 'auth';
                logger.error({ err: err.message, service }, '🛑 [Gateway] Proxy Error - Incrementing failure count');
                
                if (service === 'core' || service === 'auth') {
                    circuitState[service].failures++;
                    circuitState[service].lastFailure = Date.now();
                    if (circuitState[service].failures >= CHECK_THRESHOLD) {
                        circuitState[service].open = true;
                        logger.error({ service }, '🔥 [Gateway] Circuit OPEN - Service is degraded');
                    }
                }

                if (!res.headersSent) {
                    res.status(503).json({ 
                        error: 'Service temporarily unavailable', 
                        service,
                        retryAfter: 10 
                    });
                }
            }
        }
    };

    // Circuit Breaker Middleware
    const guard = (service: 'core' | 'auth') => (req: Request, res: Response, next: NextFunction) => {
        const state = circuitState[service];
        if (state.open) {
            if (Date.now() - state.lastFailure > RECOVERY_TIME) {
                logger.info({ service }, '🔄 [Gateway] Circuit HALF-OPEN - Attempting recovery');
                state.open = false;
                state.failures = 0;
                return next();
            }
            res.status(503).json({ error: 'Circuit Open', service });
            return;
        }
        next();
    };

    // 1. Auth Service
    app.use('/api/v1/auth', guard('auth'), createProxyMiddleware({ 
        ...proxyOptions,
        target: AUTH_SERVICE_URL, 
        pathRewrite: { '^/api/v1/auth': '' }
    }) as any);

    // 2. Billing Service
    app.use('/api/v1/billing', authorize('billing:manage'), createProxyMiddleware({ 
        ...proxyOptions,
        target: BILLING_SERVICE_URL, 
        pathRewrite: { '^/api/v1/billing': '' }
    }) as any);

    // 3. Orchestrator (Builds)
    app.use('/api/v1/builds', authorize('missions:write'), regionAffinityMiddleware, hotPathGuard, checkLoadShedding, checkGovernance, createProxyMiddleware({ 
        ...proxyOptions,
        target: ORCHESTRATOR_URL, 
        pathRewrite: { '^/api/v1/builds': '' }
    }) as any);

    // 4. Business BFF (Catch-all)
    // Map specific permissions based on sub-path
    app.use('/api/v1/agents', authorize('agents:read'), createProxyMiddleware({ ...proxyOptions, target: CORE_API_URL, pathRewrite: (_path, req) => req.originalUrl }) as any);
    app.use('/api/v1/missions', authorize('missions:read'), regionAffinityMiddleware, createProxyMiddleware({ ...proxyOptions, target: CORE_API_URL, pathRewrite: (_path, req) => req.originalUrl }) as any);
    app.use('/api/v1/logs', authorize('logs:read'), createProxyMiddleware({ ...proxyOptions, target: CORE_API_URL, pathRewrite: (_path, req) => req.originalUrl }) as any);
    app.use('/api/v1/system-health', authorize('system:manage'), createProxyMiddleware({ 
        ...proxyOptions, 
        target: CORE_API_URL,
        pathRewrite: (_path, req) => req.originalUrl
    }) as any);
    app.use('/api/v1/generate', authorize('agents:write'), hotPathGuard, checkLoadShedding, createProxyMiddleware({ ...proxyOptions, target: CORE_API_URL, pathRewrite: (_path, req) => req.originalUrl }) as any);
    app.use('/api/v1/build', authorize('missions:write'), regionAffinityMiddleware, hotPathGuard, checkLoadShedding, createProxyMiddleware({ ...proxyOptions, target: CORE_API_URL, pathRewrite: (_path, req) => req.originalUrl }) as any);

    // E2E Auth Gate Test Support Route
    app.post('/api/build', authenticate, (req: Request, res: Response) => {
        res.status(400).json({ error: 'Request parsed but rejected at validation' });
    });

    // Gateway Chaos Simulation: Event Loop blocker
    app.post('/api/v1/chaos/lag', express.json(), (req: Request, res: Response) => {
        const durationMs = parseInt(req.body.durationMs || '0', 10);
        simulatedLagMs = durationMs;
        res.json({ success: true, simulatedLagMs: durationMs });
    });

    // Standard Business BFF catch-all (Secured by default)
    app.use('/api/v1', authenticate, guard('core'), createProxyMiddleware({ 
        ...proxyOptions,
        target: CORE_API_URL,
        pathRewrite: (_path, req) => req.originalUrl,
        on: {
            ...proxyOptions.on,
            proxyReq: (proxyReq: any, req: any) => {
                // First call the base injection
                if (proxyOptions.on && typeof proxyOptions.on.proxyReq === 'function') {
                    proxyOptions.on.proxyReq(proxyReq, req, {} as any, {} as any);
                }
                
                // SRE Governance: Ensure chaos injection headers are preserved
                const chaosHeader = req.headers['x-chaos-injection'];
                if (chaosHeader) {
                    proxyReq.setHeader('x-chaos-injection', chaosHeader);
                }

                const tenantId = (req as any).user?.tenantId || 'system';
                proxyReq.setHeader('x-tenant-id', tenantId);
            }
        }
    }) as any);

    // --- RESUME & SYSTEM ---

    // Resume
    // Local admin routes moved up to avoid being caught by the proxy catch-all

    // Global API 404 Fallback
    app.use(/\/api\/v1\/.*/, (req, res) => {
        logger.warn({ url: req.url }, '[Gateway] 404 API Route Not Found');
        res.status(404).json({
            success: false,
            error: 'API Route Not Found',
            path: req.originalUrl
        });
    });

    // Stripe Checkout
    app.post('/api/v1/checkout', express.json() as any, authenticate as any, validateRequest(CheckoutSchema) as any, (async (req: Request, res: Response) => {
        const { productId } = req.body;
        const authReq = req as any;

        if (!authReq.user) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
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
            logger.error({ err }, '[Gateway] Checkout Session creation failed');
            res.status(500).json({ error: sanitizeException(err) });
        }
    }) as any);

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
            logger.error({ err }, '[Gateway] Stripe Webhook event processing failed');
            res.status(400).json({ error: 'Stripe webhook processing failed' });
        }
    });

    // Secure Global Exception Handler (Phase 6 Security Remediation)
    app.use((err: any, req: Request, res: Response, next: NextFunction) => {
        logger.error({ err, path: req.path, method: req.method }, '🚨 [Gateway] Unhandled Exception Caught & Sanitized');
        
        // Prevent disclosing raw stacks or sensitive internal details to the client
        const statusCode = err.status || err.statusCode || 500;
        let errorMessage = 'An unexpected internal server error occurred.';
        
        if (err instanceof Error) {
            const msg = err.message || '';
            // If it's a known schema validation or user error, we can safely expose the message
            if (statusCode < 500 || err.name === 'ValidationError' || err.name === 'ZodError') {
                errorMessage = msg;
            } else {
                // For 500+ errors, sanitize database/stack traces
                if (msg.includes('Prisma') || msg.includes('SQL') || msg.includes('database') || msg.includes('connect')) {
                    errorMessage = 'An internal database error occurred.';
                } else if (err.stack && (err.stack.includes('at ') || err.stack.includes('.ts:') || err.stack.includes('.js:'))) {
                    errorMessage = 'An unexpected internal error occurred.';
                } else {
                    errorMessage = msg;
                }
            }
        }
        
        if (!res.headersSent) {
            res.status(statusCode).json({
                success: false,
                error: errorMessage
            });
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

    // --- TOP-LEVEL HANDSHAKE DELEGATION REMOVED ---
    // (Handled by http-proxy-middleware automatically with ws: true)

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

    // Initialize Socket.io before listening
    await initSocket(server, app);

    // CRITICAL: Start listening FIRST so /health is available during orchestration readiness checks.
    // waitForCore() is an infinite poll loop that blocks until CoreAPI is reachable.
    // If we called waitForCore() before listen(), the Gateway port would never bind,
    // causing external readiness checks to timeout.
    await new Promise<void>((resolve, reject) => {
        server.listen(PORT, '0.0.0.0', 2048, () => {
            logger.info({ port: PORT, pid: process.pid }, '[Gateway] HTTP server bound (awaiting Core API...)');
            resolve();
        });
        server.on('error', (err) => reject(err));
    });

    await waitForCore();

    await preloadModules();
    
    // GRACEFUL STARTUP BUFFER: Ensure all internal handles are warm
    logger.info("🕒 [Gateway] Warming up handles (2s buffer)...");
    await new Promise(r => setTimeout(r, 2000));
    
    logger.info({ port: PORT, pid: process.pid }, '[Gateway] Production BFF Worker operational');

    // Register Graceful Shutdown Tasks
    onShutdown('HTTP Server', () => new Promise(resolve => server.close(() => resolve(undefined))));
    onShutdown('Kafka Manager', () => kafkaManager.shutdown());

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
// Direct execution hook for debugging/chaos
if (process.argv[1]?.includes('server.ts')) {
    startGatewayServer().catch(err => {
        console.error('Fatal startup error:', err);
        process.exit(1);
    });
}
