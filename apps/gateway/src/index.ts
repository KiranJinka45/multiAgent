import 'dotenv/config';
if (process.env.NODE_ENV !== 'production') {
  console.log('[Gateway Diagnostics] process.env.NEXT_PUBLIC_SUPABASE_URL:', process.env.NEXT_PUBLIC_SUPABASE_URL);
  console.log('[Gateway Diagnostics] NODE_ENV:', process.env.NODE_ENV);
}
import express, { Request, Response, NextFunction } from 'express';
import { ClientRequest } from 'http';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import pino from 'pino';
import http from 'http';
import { initSocket } from './socket';
import { 
    RateLimiter, 
    apiRequestDurationSeconds, 
    registry, 
    CostGovernanceService,
} from '@libs/utils/server';
// Start Telemetry (Wrapped/Delayed)
if (process.env.NODE_ENV === 'production') {
    import('@libs/observability').then(({ initTelemetry }) => {
        initTelemetry('multiagent-gateway');
    });
}

const elog = pino({
    level: process.env.LOG_LEVEL || 'info',
    transport: {
        target: 'pino-pretty',
        options: {
            colorize: true,
            translateTime: 'SYS:standard',
            ignore: 'pid,hostname',
        },
    },
});

const app = express();
app.use(eventTracker);
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';
const INTERNAL_KEY = process.env.INTERNAL_KEY || 'default-internal-secret';

// Service URLs
const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://localhost:4001';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:4002';
const BILLING_SERVICE_URL = process.env.BILLING_SERVICE_URL || 'http://localhost:4003';
const CORE_API_URL = process.env.CORE_API_URL || 'http://localhost:3001';

app.use(helmet());
app.use(cors());
app.use(express.json());

// --- RATE LIMITING ---
const rateLimiter = new RateLimiter();
const globalRateLimit = async (req: Request, res: Response, next: NextFunction) => {
    const ip = req.ip || 'unknown';
    const { allowed, remaining } = await rateLimiter.checkLimit(ip, 'gateway-global');
    if (!allowed) {
        return res.status(429).json({ 
            error: 'Too many requests', 
            retryAfter: '60s' 
        });
    }
    res.setHeader('X-RateLimit-Remaining', remaining.toString());
    next();
};

app.use(globalRateLimit);

// Metrics & Tracing middleware
app.use((req, res, next) => {
    const start = Date.now();
    
    // OTel Trace Propagation Logging
    const traceparent = req.headers['traceparent'];
    if (traceparent) {
        elog.debug({ traceparent }, '[Gateway] Incoming trace context');
    }

    res.on('finish', () => {
        const duration = (Date.now() - start) / 1000;
        const route = req.route ? req.route.path : `${req.baseUrl || ''}${req.path}`;
        apiRequestDurationSeconds.labels(req.method, route, res.statusCode.toString()).observe(duration);
    });
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
        elog.error({ err }, 'Authentication failed');
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
        elog.error({ err, userId: authReq.user.id }, 'Governance check failed');
        res.status(500).json({ error: 'Governance validation failed' });
    }
};

// --- ROUTES ---

app.get('/metrics', async (req, res) => {
    res.set('Content-Type', registry.contentType);
    res.end(await registry.metrics());
});

app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'gateway', version: '2.0.0-prod' });
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
            const { QueueManager } = await import('@libs/utils');
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
    elog.info('[Gateway] Preloading critical modules...');
    await Promise.all([
        import('@libs/db'),
        import('@libs/memory-cache'),
        import('@libs/utils')
    ]);
    elog.info('[Gateway] Warm startup complete');
};

server.listen(PORT, async () => {
    await preloadModules();
    elog.info({ port: PORT }, '[Gateway] Production BFF operational');
});
