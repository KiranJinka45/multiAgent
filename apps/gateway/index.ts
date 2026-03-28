import dotenv from 'dotenv';
dotenv.config();

import { startTracing } from '@packages/observability';
startTracing();

import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import jwt from 'jsonwebtoken';
import axios from 'axios';
import pino from 'pino';
import http from 'http';
import { Registry, Histogram, Counter } from 'prom-client';
import { initSocket } from './socket';
import { AuditLogger } from '@packages/utils';

dotenv.config();

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
const PORT = process.env.PORT || 4000;
const JWT_SECRET = process.env.JWT_SECRET || 'super-secret-key';
const INTERNAL_KEY = process.env.INTERNAL_KEY || 'default-internal-secret';

// --- METRICS SETUP ---
const register = new Registry();
const httpRequestDurationMicroseconds = new Histogram({
    name: 'http_request_duration_ms',
    help: 'Duration of HTTP requests in ms',
    labelNames: ['method', 'route', 'status_code'],
    buckets: [0.1, 5, 15, 50, 100, 200, 500, 1000, 2000, 5000],
    registers: [register]
});

const totalRequestsCounter = new Counter({
  name: 'http_requests_total',
  help: 'Total number of HTTP requests',
  labelNames: ['method', 'route', 'status_code'],
  registers: [register]
});
register.setDefaultLabels({ service: 'gateway' });

// Service URLs
const ORCHESTRATOR_URL = process.env.ORCHESTRATOR_URL || 'http://localhost:4001';
const AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://localhost:4002';
const BILLING_SERVICE_URL = process.env.BILLING_SERVICE_URL || 'http://localhost:4003';

app.use(cors());
app.use(express.json());

// Metrics & Tracing middleware
app.use((req, res, next) => {
    const start = Date.now();
    
    // OTel Trace Propagation
    const traceparent = req.headers['traceparent'];
    if (traceparent) {
        elog.info({ traceparent }, '[Gateway] Detected incoming trace context');
    }

    res.on('finish', () => {
        const duration = Date.now() - start;
        const route = req.route ? req.route.path : `${req.baseUrl || ''}${req.path}`;
        httpRequestDurationMicroseconds.labels(req.method, route, res.statusCode.toString()).observe(duration);
        totalRequestsCounter.labels(req.method, route, res.statusCode.toString()).inc();
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
        const errorMessage = err instanceof Error ? err.message : String(err);
        elog.error({ err }, `Authentication failed: ${errorMessage}`);
        return res.status(401).json({ error: 'Unauthorized' });
    }
};

// --- RBAC MIDDLEWARE ---
const rbac = (allowedRoles: string[]) => {
    return (req: Request, res: Response, next: NextFunction) => {
        const authReq = req as AuthenticatedRequest;
        const userRoles = authReq.user?.roles || [];
        const hasAccess = allowedRoles.some(role => userRoles.includes(role)) || userRoles.includes('ADMIN');
        if (!hasAccess) {
            return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
        }
        next();
    };
};

// --- ROUTES ---

app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
});

// Auth Pass-through
app.post('/auth/login', async (req: Request, res: Response) => {
    try {
        const response: { data: { user: { id: string, email: string, tenantId: string } } } = await axios.post(`${AUTH_SERVICE_URL}/login`, req.body, {
            headers: { 'X-Internal-Key': INTERNAL_KEY }
        });

        // Audit Log: Login
        const user = response.data.user;
        await AuditLogger.log({
            tenantId: user.tenantId || 'system',
            userId: user.id,
            action: 'LOGIN',
            resource: 'AUTH',
            ipAddress: req.ip,
            metadata: { email: user.email }
        });

        res.json(response.data);
    } catch (err: unknown) {
        const axiosError = err as any;
        res.status(axiosError.response?.status || 500).json(axiosError.response?.data || { error: 'Auth failed' });
    }
});

// Protected Build Routes
app.post('/build', authenticate, rbac(['FREE', 'PRO']), async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    try {
        const response = await axios.post(`${ORCHESTRATOR_URL}/run`, {
            ...req.body,
            userId: authReq.user?.id,
            tenantId: authReq.user?.tenantId
        }, {
            headers: { 'X-Internal-Key': INTERNAL_KEY }
        });

        // Audit Log: Build Trigger
        if (authReq.user) {
            await AuditLogger.log({
                tenantId: authReq.user.tenantId,
                userId: authReq.user.id,
                action: 'BUILD_TRIGGER',
                resource: `PROJECT:${req.body.projectId}`,
                ipAddress: req.ip,
                metadata: { executionId: response.data.executionId }
            });
        }

        res.json(response.data);
    } catch (err: unknown) {
        const axiosError = err as { response?: { status: number, data: Record<string, unknown> } };
        res.status(axiosError.response?.status || 500).json(axiosError.response?.data || { error: 'Build failed' });
    }
});

// Billing Routes
app.post('/billing/checkout', authenticate, async (req: Request, res: Response) => {
    const authReq = req as AuthenticatedRequest;
    try {
        const response = await axios.post(`${BILLING_SERVICE_URL}/checkout`, {
            userId: authReq.user?.id,
            plan: req.body.plan
        }, {
            headers: { 'X-Internal-Key': INTERNAL_KEY }
        });
        res.json(response.data);
    } catch (err: unknown) {
        const axiosError = err as { response?: { status: number, data: Record<string, unknown> } };
        res.status(axiosError.response?.status || 500).json(axiosError.response?.data || { error: 'Billing failed' });
    }
});

app.get('/health', (req, res) => {
    res.json({ status: 'healthy', service: 'gateway' });
});

const server = http.createServer(app);
initSocket(server);

server.listen(PORT, () => {
    console.log(`[Gateway] BFF running on port ${PORT}`);
});
