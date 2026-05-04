"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startGatewayServer = startGatewayServer;
require("dotenv/config");
const config_1 = require("@packages/config");
const express_1 = __importDefault(require("express"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const http_1 = __importDefault(require("http"));
const observability_1 = require("@packages/observability");
const events_1 = require("@packages/events");
const resilience_1 = require("@packages/resilience");
const auth_internal_1 = require("@packages/auth-internal");
const requestContext_js_1 = require("./middleware/requestContext.js");
const metricsMiddleware_js_1 = require("./middleware/metricsMiddleware.js");
const utils_1 = require("@packages/utils");
const zod_1 = require("zod");
const http_proxy_middleware_1 = require("http-proxy-middleware");
const db_1 = require("@packages/db");
const https_1 = __importDefault(require("https"));
const fs_1 = __importDefault(require("fs"));
const events_js_1 = require("./routes/events.js");
const stripe_js_1 = require("./services/stripe.js");
const resume_js_1 = __importDefault(require("./routes/resume.js"));
// --- RUNTIME INTEGRITY CHECK ---
const backend_1 = require("@packages/config/backend");
async function startGatewayServer() {
    console.log('✅ [RUNTIME CHECK] @packages/config/backend loaded successfully:', backend_1.config !== undefined);
    // Standardized Outbound Clients
    const authClient = (0, resilience_1.createOutboundClient)({
        serviceName: 'auth-service',
        baseURL: `http://127.0.0.1:${config_1.env.AUTH_SERVICE_PORT}`,
        timeout: 5000,
        retries: 2
    });
    const billingClient = (0, resilience_1.createOutboundClient)({
        serviceName: 'billing-service',
        baseURL: process.env.BILLING_SERVICE_URL || 'http://127.0.0.1:4003',
        timeout: 5000,
        retries: 2
    });
    // Initialize telemetry as early as possible
    (0, observability_1.initTelemetry)({
        serviceName: 'gateway',
        startMetricsServer: false,
    });
    const app = (0, express_1.default)();
    const PORT = config_1.env.GATEWAY_PORT;
    const JWT_SECRET = config_1.env.JWT_SECRET;
    // Service URLs - SRE Hardened: Internal Mesh uses HTTPS
    const ORCHESTRATOR_URL = config_1.env.CORE_ENGINE_URL?.replace('http://', 'https://');
    const AUTH_SERVICE_URL = `https://127.0.0.1:${config_1.env.AUTH_SERVICE_PORT}`;
    const BILLING_SERVICE_URL = (process.env.BILLING_SERVICE_URL || 'https://127.0.0.1:4003').replace('http://', 'https://');
    const CORE_API_URL = `https://127.0.0.1:${config_1.env.CORE_API_PORT}`;
    const INTERNAL_TOKEN = process.env.INTERNAL_SERVICE_TOKEN || 'internal-secret-456';
    // --- AUTH MIDDLEWARE ---
    const authenticate = (0, auth_internal_1.userAuth)({ allowDevBypass: true });
    const requireRole = (role) => (req, res, next) => {
        const authReq = req;
        if (!authReq.user || !authReq.user.roles.includes(role)) {
            observability_1.logger.warn({ userId: authReq.user?.id, role }, 'Access denied: Insufficient permissions');
            return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
        }
        next();
    };
    // --- GOVERNANCE MIDDLEWARE ---
    const checkGovernance = async (req, res, next) => {
        const authReq = req;
        if (!authReq.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        try {
            if (await utils_1.CostGovernanceService.isKillSwitchActive()) {
                return res.status(503).json({
                    error: 'Service temporarily unavailable due to maintenance',
                });
            }
            const { allowed, currentCount } = await utils_1.CostGovernanceService.checkAndIncrementExecutionLimit(authReq.user.id);
            if (!allowed) {
                return res.status(403).json({
                    error: 'Daily generation limit reached',
                    currentCount,
                });
            }
            const { allowed: tokenAllowed } = await utils_1.CostGovernanceService.checkTokenLimit(authReq.user.id);
            if (!tokenAllowed) {
                return res.status(403).json({ error: 'Monthly token budget exceeded' });
            }
            next();
        }
        catch (err) {
            observability_1.logger.error({ err, userId: authReq.user.id }, 'Governance check failed');
            return res.status(500).json({ error: 'Governance validation failed' });
        }
    };
    // --- SCHEMAS ---
    const BuildRequestSchema = zod_1.z.object({
        prompt: zod_1.z.string().min(1),
        projectId: zod_1.z.string().uuid(),
        executionId: zod_1.z.string().uuid().optional(),
    });
    // --- PROXY DEFINITION ---
    const createServiceProxy = (target, basePath, rewriteTo = '') => (0, http_proxy_middleware_1.createProxyMiddleware)({
        target,
        changeOrigin: true,
        pathRewrite: {
            [`^${basePath}`]: rewriteTo,
        },
        on: {
            proxyReq: (proxyReq, req) => {
                // 🔥 Forward identity context
                if (req.headers.authorization) {
                    proxyReq.setHeader('Authorization', req.headers.authorization);
                }
                // 🔥 Inject service-to-service token
                proxyReq.setHeader('x-internal-token', INTERNAL_TOKEN);
            },
            error: (err, req, res) => {
                console.error('[Proxy Error]', err.message);
                const response = res;
                if (!response.headersSent) {
                    response.status(502).json({ error: 'Bad Gateway', message: err.message });
                }
            },
        },
    });
    // --- CORE MIDDLEWARE ---
    app.use((0, utils_1.createSecurityMiddleware)());
    app.use((0, cookie_parser_1.default)());
    app.use(requestContext_js_1.requestContext);
    app.use((0, resilience_1.createBackpressureMiddleware)({ baseConcurrentRequests: 500 }));
    app.use(resilience_1.rateLimitMiddleware);
    app.use(metricsMiddleware_js_1.metricsMiddleware);
    // --- EDGE CDN CACHING SETTINGS ---
    app.use((req, res, next) => {
        if (req.method === 'GET' || req.method === 'HEAD') {
            // Private authenticated routes should never be cached at the edge
            if (req.path.startsWith('/api/') && req.headers.authorization) {
                res.setHeader('Cache-Control', 'private, no-cache, no-store, must-revalidate');
            }
            else if (req.path.startsWith('/public/') || req.path.startsWith('/assets/') || req.path === '/favicon.ico') {
                // Offload static and public data to Cloudflare/CDN aggressively
                res.setHeader('Cache-Control', 'public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400');
            }
            else {
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
            observability_1.logger.debug({
                requestId: req.requestId,
                traceparent,
            }, '[Gateway] Incoming trace context detected');
        }
        next();
    });
    // 5. WebSocket Tunnel (Dedicated Handshake Delegation)
    // MOVED EARLY: Must handle polling/upgrades before global REST auth/governance
    const wsProxy = (0, http_proxy_middleware_1.createProxyMiddleware)({
        target: ORCHESTRATOR_URL, // http://localhost:3002
        changeOrigin: true,
        ws: true,
        pathFilter: '/socket.io',
        on: {
            proxyReq: (proxyReq, req) => {
                // 🔥 Inject security token for the initial polling and upgrade handshake
                proxyReq.setHeader('x-internal-token', INTERNAL_TOKEN);
            },
            error: (err, req, res) => {
                observability_1.logger.error({ err: err.message }, '[Gateway] WebSocket Proxy Error');
            }
        }
    });
    app.use(wsProxy);
    // --- ROUTES ---
    app.get('/metrics', process.env.NODE_ENV === 'development'
        ? (_req, _res, next) => next()
        : (0, auth_internal_1.internalAuth)(['monitoring']), async (_req, res) => {
        try {
            res.set('Content-Type', observability_1.registry.contentType);
            res.end(await observability_1.registry.metrics());
        }
        catch {
            res.status(500).end();
        }
    });
    // --- HEALTH & STATUS ---
    app.use((0, utils_1.createHealthRouter)({
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
    const authBreaker = (0, resilience_1.createBreaker)(async (req) => req, {
        ...breakerOptions,
        name: 'auth-service'
    });
    const billingBreaker = (0, resilience_1.createBreaker)(async (req) => req, {
        ...breakerOptions,
        name: 'billing-service'
    });
    const coreApiBreaker = (0, resilience_1.createBreaker)(async (req) => req, {
        ...breakerOptions,
        name: 'core-api'
    });
    const breakerMiddleware = (breaker) => async (req, res, next) => {
        if (breaker.opened) {
            observability_1.logger.warn({ service: breaker.name }, '[Gateway] Circuit Open - Short-circuiting request');
            return res.status(503).json({
                error: 'Service temporarily unavailable (Circuit Open)',
                service: breaker.name,
                code: 'SERVICE_DEGRADED'
            });
        }
        next();
    };
    // Circuit Breaker for Stripe
    const stripeBreaker = (0, resilience_1.createBreaker)(async (_payload) => {
        return { success: true, transactionId: `txn_${Date.now()}` };
    }, {
        timeout: 10000,
        errorThresholdPercentage: 50,
        resetTimeout: 30000,
    });
    app.post('/api/checkout', express_1.default.json(), async (req, res) => {
        try {
            const result = await stripeBreaker.fire(req.body);
            res.json(result);
        }
        catch (err) {
            observability_1.logger.error({ err }, '[Gateway] Checkout Failed / Circuit Open');
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
        agent: new https_1.default.Agent({
            rejectUnauthorized: false // In prod, this would trust the specific internal CA
        }),
        onProxyReq: (proxyReq, req) => {
            proxyReq.setHeader('x-internal-token', config_1.env.INTERNAL_SERVICE_TOKEN);
            if (req.headers.authorization) {
                proxyReq.setHeader('authorization', req.headers.authorization);
            }
        }
    };
    // 1. Auth Service
    app.use((0, http_proxy_middleware_1.createProxyMiddleware)({
        ...proxyOptions,
        target: AUTH_SERVICE_URL,
        pathFilter: '/api/auth'
    }));
    // 2. Billing Service
    app.use(authenticate, (0, http_proxy_middleware_1.createProxyMiddleware)({
        ...proxyOptions,
        target: BILLING_SERVICE_URL,
        pathFilter: '/api/billing'
    }));
    // 3. Orchestrator (Builds)
    app.use(authenticate, checkGovernance, (0, http_proxy_middleware_1.createProxyMiddleware)({
        ...proxyOptions,
        target: ORCHESTRATOR_URL,
        pathFilter: '/api/builds'
    }));
    // 4. Business BFF (Catch-all for Agents, Missions, Logs, System)
    app.use(authenticate, (0, http_proxy_middleware_1.createProxyMiddleware)({
        ...proxyOptions,
        target: CORE_API_URL,
        pathFilter: (path) => path.startsWith('/api/agents') || path.startsWith('/api/missions') || path.startsWith('/api/logs') || path.startsWith('/api/system')
    }));
    // --- RESUME & SYSTEM ---
    // Resume
    app.use('/api/resume', resume_js_1.default);
    // Event Tracking
    app.post('/api/events', express_1.default.json(), (_req, _res, next) => next(), events_js_1.trackEvent);
    // Stripe Checkout
    app.post('/api/checkout', express_1.default.json(), authenticate, async (req, res) => {
        const { productId } = req.body;
        const authReq = req;
        if (!authReq.user) {
            return res.status(401).json({ error: 'Unauthorized' });
        }
        try {
            await db_1.db.event.create({
                data: {
                    name: 'conversion_started',
                    userId: authReq.user.id,
                    tenantId: authReq.user.tenantId,
                    payload: { productId },
                },
            });
            const url = await stripe_js_1.StripeService.createCheckoutSession(authReq.user.id, authReq.user.tenantId, productId);
            res.json({ url });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            res.status(500).json({ error: message });
        }
    });
    // Stripe Webhook
    app.post('/api/webhooks/stripe', express_1.default.raw({ type: 'application/json' }), async (req, res) => {
        const sig = req.headers['stripe-signature'];
        try {
            const event = await stripe_js_1.StripeService.constructEvent(req.body, sig);
            if (event.type === 'checkout.session.completed') {
                await utils_1.QueueManager.add('billing-events', {
                    type: 'subscription_created',
                    data: event.data.object,
                });
            }
            res.json({ received: true });
        }
        catch (err) {
            const message = err instanceof Error ? err.message : String(err);
            res.status(400).send(message);
        }
    });
    const certPath = '/etc/tls/tls.crt';
    const keyPath = '/etc/tls/tls.key';
    const useHttps = fs_1.default.existsSync(certPath) && fs_1.default.existsSync(keyPath);
    const server = useHttps
        ? https_1.default.createServer({
            cert: fs_1.default.readFileSync(certPath),
            key: fs_1.default.readFileSync(keyPath),
        }, app)
        : http_1.default.createServer(app);
    // --- TOP-LEVEL HANDSHAKE DELEGATION ---
    server.on('upgrade', (req, socket, head) => {
        if (req.url?.startsWith('/socket.io')) {
            observability_1.logger.info({ url: req.url }, '[Gateway] Intercepting WebSocket upgrade');
            wsProxy.upgrade(req, socket, head);
        }
    });
    // --- WARM STARTUP STRATEGY ---
    const preloadModules = async () => {
        observability_1.logger.info('[Gateway] Preloading critical modules...');
        await Promise.all([
            Promise.resolve().then(() => __importStar(require('@packages/db'))),
            Promise.resolve().then(() => __importStar(require('@packages/memory-cache'))),
            Promise.resolve().then(() => __importStar(require('@packages/utils'))),
        ]);
        observability_1.logger.info('[Gateway] Warm startup complete');
    };
    server.listen(PORT, '0.0.0.0', 2048, async () => {
        await preloadModules();
        observability_1.logger.info({ port: PORT, pid: process.pid }, '[Gateway] Production BFF Worker operational');
        // Register Graceful Shutdown Tasks
        (0, utils_1.onShutdown)('HTTP Server', () => new Promise(resolve => server.close(() => resolve())));
        (0, utils_1.onShutdown)('Kafka Manager', () => events_1.kafkaManager.shutdown());
    });
    server.on('error', (err) => {
        observability_1.logger.error({ err }, '🚨 [Gateway] FATAL SERVER ERROR');
        console.error('SERVER ERROR:', err);
    });
    process.on('uncaughtException', (err) => {
        console.error('🚨 UNCAUGHT EXCEPTION:', err);
    });
    process.on('unhandledRejection', (reason, promise) => {
        console.error('🚨 UNHANDLED REJECTION:', reason);
    });
}
//# sourceMappingURL=server.js.map