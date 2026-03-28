import 'dotenv/config';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import http from 'http';
import helmet from 'helmet';
import { logger, register, initInstrumentation } from '@packages/observability';
import { requestContext } from './middleware/requestContext';
import { metricsMiddleware } from './middleware/metricsMiddleware';
import { rateLimitMiddleware } from '@packages/resilience';
import { initSocket } from './socket';
import { CostGovernanceService } from '@packages/utils/server';
import { z } from 'zod';
import { createProxyMiddleware } from 'http-proxy-middleware';
import { ClientRequest } from 'http';
import { db } from '@packages/db';
import { trackEvent } from './routes/events';
import { StripeService } from './services/stripe';

// Initialize tracing as early as possible
initInstrumentation('gateway');

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at Gateway:', reason);
    logger.error({ reason, promise }, 'Unhandled Rejection at Gateway');
    process.exit(1);
});

process.on('uncaughtException', (error) => {
    console.error('Uncaught Exception at Gateway:', error);
    logger.error({ error }, 'Uncaught Exception at Gateway');
    process.exit(1);
});

const app = express();
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';
const INTERNAL_KEY = process.env.INTERNAL_KEY || 'default-internal-secret';

// Service URLs
const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://localhost:4001';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:4002';
const BILLING_SERVICE_URL = process.env.BILLING_SERVICE_URL || 'http://localhost:4003';
const CORE_API_URL = process.env.CORE_API_URL || 'http://localhost:3001';

app.use(requestContext);
app.use(metricsMiddleware);
app.use(rateLimitMiddleware);
app.use(helmet());
app.use(cors());
app.use(express.json());

// Tracing Propagation Logger
app.use((req, res, next) => {
    const traceparent = req.headers['traceparent'];
    if (traceparent) {
        logger.debug({ 
            requestId: (req as any).requestId,
            traceparent 
        }, '[Gateway] Incoming trace context detected');
    }
    next();
});

// --- CUSTOM TYPES ---
interface UserPayload {
    id: string;
    email: string;
    tenantId: string;
    roles: string[];
}

interface AuthenticatedRequest extends Request {
    user?: UserPayload;
}

// --- AUTH MIDDLEWARE ---
const authenticate = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers.authorization;
    if (!authHeader) return res.status(401).json({ error: 'Unauthorized' });

    const token = authHeader.split(' ')[1];
    try {
        const decoded = jwt.verify(token, JWT_SECRET) as UserPayload;
        (req as AuthenticatedRequest).user = decoded;
        next();
    } catch (err: unknown) {
        logger.error({ err }, 'Authentication failed');
        return res.status(401).json({ error: 'Unauthorized' });
    }
};

// --- GOVERNANCE MIDDLEWARE ---
const checkGovernance = async (req: Request, res: Response, next: NextFunction) => {
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) return res.status(401).json({ error: 'Unauthorized' });

    try {
        // 1. Check Global Kill Switch
        if (await CostGovernanceService.isKillSwitchActive()) {
            return res.status(503).json({ error: 'Service temporarily unavailable due to maintenance' });
        }

        // 2. Check Daily Execution Limit
        const { allowed, currentCount } = await CostGovernanceService.checkAndIncrementExecutionLimit(authReq.user.id);
        if (!allowed) {
            return res.status(403).json({ 
                error: 'Daily generation limit reached', 
                currentCount 
            });
        }

        // 3. Check Monthly Token Budget
        const { allowed: tokenAllowed } = await CostGovernanceService.checkTokenLimit(authReq.user.id);
        if (!tokenAllowed) {
            return res.status(403).json({ error: 'Monthly token budget exceeded' });
        }

        next();
    } catch (err) {
        logger.error({ err, userId: authReq.user.id }, 'Governance check failed');
        res.status(500).json({ error: 'Governance validation failed' });
    }
};

// --- ROUTES ---

app.get('/metrics', async (req, res) => {
    try {
        res.set('Content-Type', register.contentType);
        res.end(await register.metrics());
    } catch {
        res.status(500).end();
    }
});

app.get('/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        service: 'gateway', 
        version: '2.0.0-prod',
        timestamp: new Date().toISOString()
    });
});

app.get('/ready', (req, res) => {
    // Check downstream dependencies if needed (Redis, DB)
    res.json({ status: 'ready' });
});

// --- SCHEMAS ---
const BuildRequestSchema = z.object({
    prompt: z.string().min(1),
    projectId: z.string().uuid(),
    executionId: z.string().uuid().optional(),
});

// --- PROXY DEFINITIONS ---

const createServiceProxy = (target: string) => createProxyMiddleware({
    target,
    changeOrigin: true,
    pathRewrite: {
        '^/api/core': '',
    },
    headers: {
        'X-Internal-Key': INTERNAL_KEY
    },
    onProxyReq: (proxyReq: ClientRequest, req: Request) => {
        const authReq = req as AuthenticatedRequest;
        if (authReq.user) {
            proxyReq.setHeader('X-User-ID', authReq.user.id);
            proxyReq.setHeader('X-Tenant-ID', authReq.user.tenantId);
            proxyReq.setHeader('X-User-Roles', JSON.stringify(authReq.user.roles));
        }
    }
});

// Orchestrator Proxy (Builds)
app.use('/api/builds', authenticate, checkGovernance, (req, res, next) => {
    const result = BuildRequestSchema.safeParse(req.body);
    if (!result.success) {
        return res.status(400).json({ error: 'Invalid build request', details: result.error.format() });
    }
    next();
}, createServiceProxy(ORCHESTRATOR_URL));

// Auth Proxy
app.use('/api/auth', createServiceProxy(AUTH_SERVICE_URL));

// Billing Proxy
app.use('/api/billing', authenticate, createServiceProxy(BILLING_SERVICE_URL));

// Core API Proxy
app.use('/api/core', authenticate, createServiceProxy(CORE_API_URL));

// AI Resume Optimizer Route
import resumeRouter from './routes/resume';
app.use('/api/resume', resumeRouter);

// --- BUSINESS & REVENUE ROUTES ---

// Event Tracking
app.post('/api/events', (req: Request, res: Response, next: NextFunction) => {
    // Optional: add lightweight auth or allow anonymous tracking
    next();
}, trackEvent as (req: Request, res: Response) => Promise<void>);

// Stripe Checkout
app.post('/api/checkout', authenticate, async (req: Request, res: Response) => {
    const { productId } = req.body;
    const authReq = req as AuthenticatedRequest;
    if (!authReq.user) return res.status(401).json({ error: 'Unauthorized' });

    try {
        // Track Conversion Intent
        await db.event.create({
            data: {
                name: 'conversion_started',
                userId: authReq.user.id,
                tenantId: authReq.user.tenantId,
                payload: { productId }
            }
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
app.post('/api/webhooks/stripe', express.raw({ type: 'application/json' }), async (req: Request, res: Response) => {
    const sig = req.headers['stripe-signature'] as string;
    try {
        const event = await StripeService.constructEvent(req.body, sig);
        
        if (event.type === 'checkout.session.completed') {
            const { QueueManager } = await import('@packages/utils/server');
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

const server = http.createServer(app);
initSocket(server);

// --- WARM STARTUP STRATEGY (Step 9) ---
const preloadModules = async () => {
    logger.info('[Gateway] Preloading critical modules...');
    await Promise.all([
        import('@packages/db'),
        import('@packages/memory-cache'),
        import('@packages/utils')
    ]);
    logger.info('[Gateway] Warm startup complete');
};

server.listen(PORT, async () => {
    await preloadModules();
    logger.info({ port: PORT }, '[Gateway] Production BFF operational');
});

// --- GRACEFUL SHUTDOWN ---
const shutdown = async (signal: string) => {
    logger.info({ signal }, '[Gateway] Shutdown initiated');
    server.close(() => {
        logger.info('[Gateway] HTTP server closed');
        process.exit(0);
    });

    // Force exit after 10s
    setTimeout(() => {
        logger.error('[Gateway] Forced shutdown after timeout');
        process.exit(1);
    }, 10000);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
