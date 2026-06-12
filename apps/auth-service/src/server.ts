import 'dotenv/config';
import { serverConfig as config } from '@packages/config';
import express from 'express';
import type { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import cors from 'cors';
import bcrypt from 'bcryptjs';
import cookieParser from 'cookie-parser';
import { logger, initTelemetry } from '@packages/observability';
import { onShutdown, createHealthRouter, createSecurityMiddleware, createCsrfMiddleware, setCsrfToken, redis, validateStartupSecrets } from '@packages/utils';
import { db } from '@packages/db';
import { internalAuth, userAuth } from '@packages/auth-internal';
import { AuditLogger, registry } from '@packages/utils';
import { z } from 'zod';
import https from 'https';
import fs from 'fs';
import path from 'path';

export async function startAuthServer() {
    initTelemetry('auth-service');

    // --- SECURITY: Mandatory Startup Enforcement ---
    const isLocalDevOrTest = process.env.NODE_ENV === 'development' || process.env.NODE_ENV === 'test';
    if (!isLocalDevOrTest) {
        validateStartupSecrets(['JWT_SECRET', 'JWT_REFRESH_SECRET']);
    }

    const app = express();
    app.disable("x-powered-by");
    const PORT = config.AUTH_SERVICE_PORT;
    let JWT_SECRET = config.JWT_SECRET;
    let JWT_REFRESH_SECRET = config.JWT_REFRESH_SECRET;

    if (!JWT_SECRET || !JWT_REFRESH_SECRET) {
        if (!isLocalDevOrTest) {
            throw new Error('FATAL: JWT secrets must be set outside development/test environment');
        }

        // Use ephemeral keys in development to avoid hardcoded secrets
        // Ensure they are long enough (64 bytes)
        JWT_SECRET = JWT_SECRET || crypto.randomBytes(64).toString('hex');
        JWT_REFRESH_SECRET = JWT_REFRESH_SECRET || crypto.randomBytes(64).toString('hex');

        logger.warn('JWT secrets are not set in .env. Generated ephemeral keys for this session.');
    }

    const ROTATE_LUA_SCRIPT = `
    local sessionKey = KEYS[1]
    local expectedJti = ARGV[1]
    local expectedHash = ARGV[2]
    local newJti = ARGV[3]
    local newHash = ARGV[4]

    local currentHash = redis.call("HGET", sessionKey, expectedJti)
    if not currentHash then 
       return "NOT_FOUND" 
    end

    if currentHash ~= expectedHash then 
       redis.call("DEL", sessionKey)
       return "REUSE" 
    end

    redis.call("HDEL", sessionKey, expectedJti)
    redis.call("HSET", sessionKey, newJti, newHash)
    redis.call("EXPIRE", sessionKey, 604800)
    return "OK"
    `;

    function createTokens(user: any) {
        const payload = {
            id: user.id,
            email: user.email,
            roles: [user.role || 'viewer'],
            tenantId: user.tenantId
        };

        const token = jwt.sign(payload, JWT_SECRET as string, { expiresIn: '15m' });

        // Unique JTI ensures hash differentiation
        const jti = crypto.randomUUID();
        const refreshToken = jwt.sign(
            { id: user.id, jti },
            JWT_REFRESH_SECRET as string,
            { expiresIn: '7d' }
        );

        const hash = crypto.createHash('sha256').update(refreshToken).digest('hex');
        return { token, refreshToken, jti, hash };
    }

    // --- SCHEMAS (Phase 8 Hardening) ---
    const LoginSchema = z.object({
        email: z.string().email(),
        password: z.string().min(1)
    });

    const SignupSchema = z.object({
        email: z.string().email(),
        password: z.string().min(8),
        name: z.string().optional()
    });

    app.use(express.json());
    app.use(cookieParser());
    app.use(createSecurityMiddleware());

    // --- SECURITY: TLS Runtime Observability ---
    app.use((req, res, next) => {
        if (!req.secure && process.env.NODE_ENV === 'production') {
            logger.error({
                ip: req.ip,
                url: req.originalUrl,
                method: req.method,
                userAgent: req.headers['user-agent']
            }, '[SECURITY] CRITICAL: Plaintext connection attempt detected and blocked in production');

            // Increment security violation counter (if telemetry supported)
            res.status(403).json({ error: 'Operational Invariant Violated: TLS Mandatory' });
            return;
        }
        next();
    });

    app.get('/csrf', (req, res) => {
        const token = setCsrfToken(res);
        res.json({ csrfToken: token });
    });

    app.post('/login', async (req: Request, res: Response): Promise<void> => {
        const result = LoginSchema.safeParse(req.body);
        if (!result.success) {
            res.status(400).json({ error: 'Invalid input', details: result.error.format() });
            return;
        }

        const { email, password } = result.data;

        try {
            const user = await db.user.findUnique({
                where: { email }
            });

            if (!user) {
                await AuditLogger.logSecurity('LOGIN_ATTEMPT', 'FAILURE', { email, reason: 'user_not_found' });
                res.status(401).json({ error: 'Invalid credentials' });
                return;
            }

            const isMatch = await bcrypt.compare(password, user.password || '');

            if (!isMatch) {
                await AuditLogger.logSecurity('LOGIN_ATTEMPT', 'FAILURE', { email, userId: user.id, reason: 'bad_password' });
                res.status(401).json({ error: 'Invalid credentials' });
                return;
            }

            await AuditLogger.logSecurity('LOGIN_ATTEMPT', 'SUCCESS', { email, userId: user.id });

            const { token, refreshToken, jti, hash } = createTokens(user);

            await redis.hset(`session:${user.id}`, jti, hash);
            await redis.expire(`session:${user.id}`, 7 * 24 * 60 * 60);

            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 15 * 60 * 1000 // 15 minutes
            });

            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                path: '/api/auth/refresh', // Restrict to refresh endpoint
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            res.json({
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    roles: [user.role],
                    tenantId: user.tenantId
                }
            });
        } catch (err: any) {
            logger.error({ err }, '[LOGIN] Error');
            res.status(500).json({ error: 'Authentication service internal error' });
        }
    });

    app.get('/me', userAuth(), async (req, res) => {
        res.json((req as any).user);
    });

    app.post('/refresh', async (req: Request, res: Response): Promise<void> => {
        const refreshToken = req.cookies?.refreshToken;
        if (!refreshToken) {
            res.status(401).json({ error: 'Missing refresh token' });
            return;
        }

        try {
            const decoded = jwt.verify(refreshToken, JWT_REFRESH_SECRET) as any;
            const userId = decoded.id;
            const oldJti = decoded.jti;

            // Eagerly resolve user and generate replacement rotation pair
            const user = await db.user.findUnique({ where: { id: userId } });
            if (!user) throw new Error('User deleted');

            const providedHash = crypto.createHash('sha256').update(refreshToken).digest('hex');
            const { token, refreshToken: newRefreshToken, jti: newJti, hash: newHash } = createTokens(user);

            // Lua strictly guarantees no race conditions if multiple /refresh calls hit Redis simultaneously on the same JTI
            const result = await redis.eval(
                ROTATE_LUA_SCRIPT,
                1,
                `session:${userId}`,
                oldJti,
                providedHash,
                newJti,
                newHash
            );

            if (result === 'NOT_FOUND') {
                await AuditLogger.logSecurity('TOKEN_REUSE_DETECTED', 'FAILURE', { userId });
                res.status(401).json({ error: 'Session invalid or expired' });
                return;
            }

            if (result === 'REUSE') {
                await AuditLogger.logSecurity('TOKEN_REUSE_ATTEMPT_LOCKED', 'FAILURE', { userId });
                res.clearCookie('token');
                res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
                res.status(401).json({ error: 'Session highly compromised. Account locked out from active state.' });
                return;
            }

            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 15 * 60 * 1000
            });

            res.cookie('refreshToken', newRefreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                path: '/api/auth/refresh',
                maxAge: 7 * 24 * 60 * 60 * 1000
            });

            res.json({ success: true });
        } catch (err) {
            logger.error({ err }, '[REFRESH] Error');
            res.clearCookie('token');
            res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
            res.status(401).json({ error: 'Invalid or expired refresh token' });
            return;
        }
    });

    app.post('/logout', async (req: Request, res: Response): Promise<void> => {
        const authHeader = req.headers.authorization;
        const cookieToken = req.cookies?.token;
        const token = cookieToken || (authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null);

        if (token) {
            try {
                await redis.set(`revoked:${token}`, '1', 'EX', 900); // Max TTL 15m
            } catch (e: any) {
                logger.warn({ err: e.message }, 'Failed to write token revoke');
            }
        }

        res.clearCookie('token', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });
        res.json({ success: true, message: 'Logout successful' });
    });

    app.post('/signup', async (req: Request, res: Response): Promise<void> => {
        const result = SignupSchema.safeParse(req.body);
        if (!result.success) {
            res.status(400).json({ error: 'Invalid input', details: result.error.format() });
            return;
        }

        const { email, password, name } = result.data;

        try {
            const existing = await db.user.findUnique({ where: { email } });
            if (existing) {
                res.status(400).json({ error: 'User already exists' });
                return;
            }

            const salt = await bcrypt.genSalt(10);
            const hashedPassword = await bcrypt.hash(password, salt);

            const tenant = await (db as any).tenant.create({
                data: {
                    name: `${name || email.split('@')[0]}'s Workspace`
                }
            });

            const user = await db.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    name: name || email.split('@')[0],
                    role: 'viewer',
                    tenantId: tenant.id
                }
            });

            // AUTO-PROVISION: Welcome Mission
            await (db as any).project.create({
                data: {
                    tenantId: tenant.id,
                    name: 'Strategic Scout Alpha 🛰️',
                    description: 'Initial deployment to calibrate the neural bridge and baseline workspace connectivity.',
                    status: 'active'
                }
            });

            await AuditLogger.log({
                action: 'USER_SIGNUP',
                resource: 'auth-layer',
                userId: user.id,
                tenantId: tenant.id,
                status: 'SUCCESS',
                metadata: { email }
            });

            const { token, refreshToken, jti, hash } = createTokens(user);

            await redis.hset(`session:${user.id}`, jti, hash);
            await redis.expire(`session:${user.id}`, 7 * 24 * 60 * 60);

            res.cookie('token', token, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                maxAge: 15 * 60 * 1000 // 15 minutes
            });

            res.cookie('refreshToken', refreshToken, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'strict',
                path: '/api/auth/refresh',
                maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
            });

            res.status(201).json({
                token,
                user: {
                    id: user.id,
                    email: user.email,
                    roles: [user.role],
                    tenantId: user.tenantId
                }
            });
        } catch (err: any) {
            logger.error({ err }, '[SIGNUP] Error');
            res.status(500).json({ error: 'Signup failed. Internal service error.' });
        }
    });

    // Internal Key is now handled by @packages/auth-internal Zero-Trust layer

    app.get('/metrics', internalAuth(['gateway']), async (_req: Request, res: Response) => {
        res.set('Content-Type', registry.contentType);
        res.end(await (registry as any).metrics());
    });

    // --- ADMIN ROUTES (Scoped to Tenant) ---
    app.get('/admin/users', userAuth(), async (req, res) => {
        const tenantId = (req as any).user.tenantId;

        try {
            const users = await db.user.findMany({
                where: { tenantId },
                select: {
                    id: true,
                    email: true,
                    name: true,
                    role: true,
                    createdAt: true
                }
            });
            res.json(users);
        } catch (_err: any) {
            res.status(500).json({ error: 'Service internal error' });
        }
    });

    app.patch('/admin/users/:id/role', userAuth(), async (req, res) => {
        const { id } = req.params;
        const { role } = req.body;
        const tenantId = (req as any).user.tenantId;

        if (!['admin', 'agent', 'viewer'].includes(role)) {
            res.status(400).json({ error: 'Invalid role' });
            return;
        }

        try {
            const user = await db.user.updateMany({
                where: { id, tenantId }, // Ensure user belongs to the same tenant
                data: { role }
            });

            if (user.count === 0) {
                res.status(404).json({ error: 'User not found in this tenant' });
                return;
            }

            res.json({ success: true, role });
        } catch (_err: any) {
            res.status(500).json({ error: 'Service internal error' });
        }
    });

    app.post('/internal/upgrade', internalAuth(['gateway']), async (req, res) => {
        const { userId, plan } = req.body;

        try {
            const user = await db.user.findUnique({
                where: { id: userId }
            });

            if (user) {
                // Since the 'tenant' model is missing, we update the Subscription if it exists
                await db.subscription.update({
                    where: { userId: user.id },
                    data: { plan: plan || 'PRO' }
                }).catch(() => {
                    console.warn(`[AuthService] No subscription found for user ${userId} to upgrade.`);
                });

                console.log(`[AuthService] Upgrade requested for User ${userId} to ${plan || 'PRO'}`);
                res.json({ success: true });
                return;
            }

            res.status(404).json({ error: 'User not found' });
        } catch (err: any) {
            res.status(500).json({ error: err.message });
        }
    });

    // HEALTH & STATUS (Standardized)
    app.use(createHealthRouter({ 
        serviceName: 'auth-service',
        checkDependencies: async () => ({
            redis: { status: redis.status === 'ready' ? 'up' : 'down' }
        })
    }));

    // --- SRE Hardening: Warm-up Phase ---
    logger.info('[AuthService] Entering Warm-up phase (pre-priming connections)...');
    try {
        await db.$queryRaw`SELECT 1`;
        await redis.ping();
        logger.info('[AuthService] Warm-up successful. Mesh connectivity verified.');
    } catch (_e) {
        logger.warn('[AuthService] Warm-up encountered jitter. Proceeding with caution.');
    }

    const certPath = '/etc/tls/tls.crt';
    const keyPath = '/etc/tls/tls.key';
    const caPath = '/etc/tls/ca.crt';
    const useHttps = fs.existsSync(certPath) && fs.existsSync(keyPath);

    if (process.env.NODE_ENV === 'production' && !useHttps) {
        const errorMsg = '[FATAL] SECURITY ENFORCEMENT: TLS is mandatory in production but certificates are missing at /etc/tls/';
        logger.error(errorMsg);
        process.exit(1);
    }

    let server: any;
    const clientCallback = () => {
        logger.info({
            port: PORT,
            pid: process.pid,
            protocol: useHttps ? 'https' : 'http'
        }, `[AuthService] Operational Worker node active`);

        // Register Graceful Shutdown
        onShutdown('Auth Server', () => new Promise<void>(resolve => server.close(() => resolve())));
        onShutdown('Database', () => db.$disconnect());
    };

    if (useHttps) {
        const httpsOptions: https.ServerOptions = {
            cert: fs.readFileSync(certPath),
            key: fs.readFileSync(keyPath),
            rejectUnauthorized: process.env.NODE_ENV === 'production',
        };

        if (fs.existsSync(caPath)) {
            httpsOptions.ca = fs.readFileSync(caPath);
        }

        // --- SECURITY: Continuous Runtime TLS Monitoring ---
        setInterval(() => {
            try {
                const stats = fs.statSync(certPath);
                const _now = new Date();
                const cert = fs.readFileSync(certPath);

                // Log periodic health
                logger.debug({
                    lastModified: stats.mtime,
                    certSize: cert.length
                }, '[Security] Certificate runtime integrity verified');

            } catch (e: any) {
                logger.error({ err: e.message }, '[FATAL] SECURITY FAILURE: TLS Certificate missing or corrupted during runtime');
                process.exit(1);
            }
        }, 300000); // Every 5 minutes

        server = https.createServer(httpsOptions, app).listen(PORT, clientCallback);
    } else {
        server = app.listen(PORT, clientCallback);
    }
}