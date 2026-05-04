"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.startAuthServer = startAuthServer;
require("dotenv/config");
const config_1 = require("@packages/config");
const express_1 = __importDefault(require("express"));
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const crypto_1 = __importDefault(require("crypto"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const observability_1 = require("@packages/observability");
const utils_1 = require("@packages/utils");
const db_1 = require("@packages/db");
const auth_internal_1 = require("@packages/auth-internal");
const utils_2 = require("@packages/utils");
const zod_1 = require("zod");
const https_1 = __importDefault(require("https"));
const fs_1 = __importDefault(require("fs"));
async function startAuthServer() {
    (0, observability_1.initTelemetry)({ serviceName: 'auth-service' });
    const app = (0, express_1.default)();
    const PORT = config_1.env.AUTH_SERVICE_PORT;
    const JWT_SECRET = config_1.env.JWT_SECRET;
    const JWT_REFRESH_SECRET = config_1.env.JWT_REFRESH_SECRET;
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
    function createTokens(user) {
        const payload = {
            id: user.id,
            email: user.email,
            roles: [user.role || 'viewer'],
            tenantId: user.tenantId
        };
        const token = jsonwebtoken_1.default.sign(payload, JWT_SECRET, { expiresIn: '15m' });
        // Unique JTI ensures hash differentiation
        const jti = crypto_1.default.randomUUID();
        const refreshToken = jsonwebtoken_1.default.sign({ id: user.id, jti }, JWT_REFRESH_SECRET, { expiresIn: '7d' });
        const hash = crypto_1.default.createHash('sha256').update(refreshToken).digest('hex');
        return { token, refreshToken, jti, hash };
    }
    // --- SCHEMAS (Phase 8 Hardening) ---
    const LoginSchema = zod_1.z.object({
        email: zod_1.z.string().email(),
        password: zod_1.z.string().min(1)
    });
    const SignupSchema = zod_1.z.object({
        email: zod_1.z.string().email(),
        password: zod_1.z.string().min(8),
        name: zod_1.z.string().optional()
    });
    app.use((0, utils_1.createSecurityMiddleware)());
    app.use(express_1.default.json());
    app.use((0, cookie_parser_1.default)());
    app.get('/csrf', (req, res) => {
        const { setCsrfToken } = require('@packages/utils');
        const token = setCsrfToken(res);
        res.json({ csrfToken: token });
    });
    app.post('/login', async (req, res) => {
        const result = LoginSchema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({ error: 'Invalid input', details: result.error.format() });
        }
        const { email, password } = result.data;
        try {
            const user = await db_1.db.user.findUnique({
                where: { email }
            });
            if (!user) {
                await utils_2.AuditLogger.logSecurity('LOGIN_ATTEMPT', 'FAILURE', { email, reason: 'user_not_found' });
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            const isMatch = await bcryptjs_1.default.compare(password, user.password || '');
            if (!isMatch) {
                await utils_2.AuditLogger.logSecurity('LOGIN_ATTEMPT', 'FAILURE', { email, userId: user.id, reason: 'bad_password' });
                return res.status(401).json({ error: 'Invalid credentials' });
            }
            await utils_2.AuditLogger.logSecurity('LOGIN_ATTEMPT', 'SUCCESS', { email, userId: user.id });
            const { token, refreshToken, jti, hash } = createTokens(user);
            await utils_1.redis.hset(`session:${user.id}`, jti, hash);
            await utils_1.redis.expire(`session:${user.id}`, 7 * 24 * 60 * 60);
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
        }
        catch (err) {
            observability_1.logger.error({ err }, '[LOGIN] Error');
            res.status(500).json({ error: 'Authentication service internal error' });
        }
    });
    app.get('/me', (0, auth_internal_1.userAuth)(), async (req, res) => {
        res.json(req.user);
    });
    app.post('/refresh', async (req, res) => {
        const refreshToken = req.cookies?.refreshToken;
        if (!refreshToken) {
            return res.status(401).json({ error: 'Missing refresh token' });
        }
        try {
            const decoded = jsonwebtoken_1.default.verify(refreshToken, JWT_REFRESH_SECRET);
            const userId = decoded.id;
            const oldJti = decoded.jti;
            // Eagerly resolve user and generate replacement rotation pair
            const user = await db_1.db.user.findUnique({ where: { id: userId } });
            if (!user)
                throw new Error('User deleted');
            const providedHash = crypto_1.default.createHash('sha256').update(refreshToken).digest('hex');
            const { token, refreshToken: newRefreshToken, jti: newJti, hash: newHash } = createTokens(user);
            // Lua strictly guarantees no race conditions if multiple /refresh calls hit Redis simultaneously on the same JTI
            const result = await utils_1.redis.eval(ROTATE_LUA_SCRIPT, 1, `session:${userId}`, oldJti, providedHash, newJti, newHash);
            if (result === 'NOT_FOUND') {
                await utils_2.AuditLogger.logSecurity('TOKEN_REUSE_DETECTED', 'FAILURE', { userId });
                return res.status(401).json({ error: 'Session invalid or expired' });
            }
            if (result === 'REUSE') {
                await utils_2.AuditLogger.logSecurity('TOKEN_REUSE_ATTEMPT_LOCKED', 'CRITICAL', { userId });
                res.clearCookie('token');
                res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
                return res.status(401).json({ error: 'Session highly compromised. Account locked out from active state.' });
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
        }
        catch (err) {
            observability_1.logger.error({ err }, '[REFRESH] Error');
            res.clearCookie('token');
            res.clearCookie('refreshToken', { path: '/api/auth/refresh' });
            return res.status(401).json({ error: 'Invalid or expired refresh token' });
        }
    });
    app.post('/logout', async (req, res) => {
        const authHeader = req.headers.authorization;
        const cookieToken = req.cookies?.token;
        const token = cookieToken || (authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null);
        if (token) {
            try {
                await utils_1.redis.set(`revoked:${token}`, '1', 'EX', 900); // Max TTL 15m
            }
            catch (e) {
                observability_1.logger.warn({ err: e.message }, 'Failed to write token revoke');
            }
        }
        res.clearCookie('token', { httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'strict' });
        res.json({ success: true, message: 'Logout successful' });
    });
    app.post('/signup', async (req, res) => {
        const result = SignupSchema.safeParse(req.body);
        if (!result.success) {
            return res.status(400).json({ error: 'Invalid input', details: result.error.format() });
        }
        const { email, password, name } = result.data;
        try {
            const existing = await db_1.db.user.findUnique({ where: { email } });
            if (existing) {
                return res.status(400).json({ error: 'User already exists' });
            }
            const salt = await bcryptjs_1.default.genSalt(10);
            const hashedPassword = await bcryptjs_1.default.hash(password, salt);
            const tenant = await db_1.db.tenant.create({
                data: {
                    name: `${name || email.split('@')[0]}'s Workspace`
                }
            });
            const user = await db_1.db.user.create({
                data: {
                    email,
                    password: hashedPassword,
                    name: name || email.split('@')[0],
                    role: 'viewer',
                    tenantId: tenant.id
                }
            });
            // AUTO-PROVISION: Welcome Mission
            await db_1.db.project.create({
                data: {
                    tenantId: tenant.id,
                    name: 'Strategic Scout Alpha 🛰️',
                    description: 'Initial deployment to calibrate the neural bridge and baseline workspace connectivity.',
                    status: 'active'
                }
            });
            await utils_2.AuditLogger.log({
                action: 'USER_SIGNUP',
                resource: 'auth-layer',
                userId: user.id,
                tenantId: tenant.id,
                status: 'SUCCESS',
                metadata: { email }
            });
            const { token, refreshToken, jti, hash } = createTokens(user);
            await utils_1.redis.hset(`session:${user.id}`, jti, hash);
            await utils_1.redis.expire(`session:${user.id}`, 7 * 24 * 60 * 60);
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
        }
        catch (err) {
            observability_1.logger.error({ err }, '[SIGNUP] Error');
            res.status(500).json({ error: 'Signup failed. Internal service error.' });
        }
    });
    // Internal Key is now handled by @packages/auth-internal Zero-Trust layer
    app.get('/metrics', (0, auth_internal_1.internalAuth)(['gateway']), async (_req, res) => {
        res.set('Content-Type', registry.contentType);
        res.end(await registry.metrics());
    });
    // --- ADMIN ROUTES (Scoped to Tenant) ---
    app.get('/admin/users', (0, auth_internal_1.userAuth)(), async (req, res) => {
        const tenantId = req.user.tenantId;
        try {
            const users = await db_1.db.user.findMany({
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
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    app.patch('/admin/users/:id/role', (0, auth_internal_1.userAuth)(), async (req, res) => {
        const { id } = req.params;
        const { role } = req.body;
        const tenantId = req.user.tenantId;
        if (!['admin', 'agent', 'viewer'].includes(role)) {
            return res.status(400).json({ error: 'Invalid role' });
        }
        try {
            const user = await db_1.db.user.updateMany({
                where: { id, tenantId }, // Ensure user belongs to the same tenant
                data: { role }
            });
            if (user.count === 0) {
                return res.status(404).json({ error: 'User not found in this tenant' });
            }
            res.json({ success: true, role });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    app.post('/internal/upgrade', (0, auth_internal_1.internalAuth)(['gateway']), async (req, res) => {
        const { userId, plan } = req.body;
        try {
            const user = await db_1.db.user.findUnique({
                where: { id: userId }
            });
            if (user) {
                // Since the 'tenant' model is missing, we update the Subscription if it exists
                await db_1.db.subscription.update({
                    where: { userId: user.id },
                    data: { plan: plan || 'PRO' }
                }).catch(() => {
                    console.warn(`[AuthService] No subscription found for user ${userId} to upgrade.`);
                });
                console.log(`[AuthService] Upgrade requested for User ${userId} to ${plan || 'PRO'}`);
                return res.json({ success: true });
            }
            res.status(404).json({ error: 'User not found' });
        }
        catch (err) {
            res.status(500).json({ error: err.message });
        }
    });
    // HEALTH & STATUS (Standardized)
    app.use((0, utils_1.createHealthRouter)({ serviceName: 'auth-service' }));
    // --- SRE Hardening: Warm-up Phase ---
    observability_1.logger.info('[AuthService] Entering Warm-up phase (pre-priming connections)...');
    try {
        await db_1.db.$queryRaw `SELECT 1`;
        await utils_1.redis.ping();
        observability_1.logger.info('[AuthService] Warm-up successful. Mesh connectivity verified.');
    }
    catch (e) {
        observability_1.logger.warn('[AuthService] Warm-up encountered jitter. Proceeding with caution.');
    }
    const certPath = '/etc/tls/tls.crt';
    const keyPath = '/etc/tls/tls.key';
    const useHttps = fs_1.default.existsSync(certPath) && fs_1.default.existsSync(keyPath);
    const clientCallback = () => {
        observability_1.logger.info({
            port: PORT,
            pid: process.pid,
            protocol: useHttps ? 'https' : 'http'
        }, `[AuthService] Operational Worker node active`);
        // Register Graceful Shutdown
        (0, utils_1.onShutdown)('Auth Server', () => new Promise(resolve => server.close(() => resolve())));
        (0, utils_1.onShutdown)('Database', () => db_1.db.$disconnect());
    };
    const server = useHttps
        ? https_1.default.createServer({
            cert: fs_1.default.readFileSync(certPath),
            key: fs_1.default.readFileSync(keyPath),
            rejectUnauthorized: false,
        }, app).listen(PORT, clientCallback)
        : app.listen(PORT, clientCallback);
}
//# sourceMappingURL=server.js.map