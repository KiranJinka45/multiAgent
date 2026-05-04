"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ROLE_PERMISSIONS = void 0;
exports.internalAuth = internalAuth;
exports.requirePermission = requirePermission;
exports.signInternalToken = signInternalToken;
exports.userAuth = userAuth;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const observability_1 = require("@packages/observability");
const config_1 = require("@packages/config");
const utils_1 = require("@packages/utils");
exports.ROLE_PERMISSIONS = {
    viewer: ['agents:read', 'missions:read', 'projects:read'],
    agent: ['agents:read', 'agents:write', 'missions:read', 'missions:write', 'projects:read', 'projects:write'],
    admin: [
        'agents:read', 'agents:write',
        'missions:read', 'missions:write',
        'projects:read', 'projects:write',
        'logs:read',
        'billing:manage',
        'system:manage'
    ],
    owner: [
        'agents:read', 'agents:write',
        'missions:read', 'missions:write',
        'projects:read', 'projects:write',
        'logs:read',
        'billing:manage',
        'system:manage'
    ],
};
/**
 * INTERNAL AUTH MIDDLEWARE
 */
function internalAuth(allowedServices) {
    return (req, res, next) => {
        const { contextStorage } = require('@packages/utils');
        const internalToken = req.headers['x-internal-token'];
        if (internalToken !== config_1.env.INTERNAL_SERVICE_TOKEN) {
            observability_1.logger.warn({ path: req.path }, '[AuthInternal] REJECTED: Invalid Internal Service Token');
            return res.status(401).json({ error: 'Invalid or missing service token' });
        }
        const authHeader = req.headers.authorization;
        if (!authHeader?.startsWith('Bearer ')) {
            return res.status(401).json({ error: 'Identity context required' });
        }
        const token = authHeader.split(' ')[1];
        try {
            const secret = config_1.env.JWT_SECRET;
            if (!secret) {
                throw new Error('JWT_SECRET not configured');
            }
            const decoded = jsonwebtoken_1.default.verify(token, secret);
            req.user = decoded;
            // Set Context
            contextStorage.run({
                requestId: req.requestId || 'svc-' + Math.random().toString(36).substring(7),
                userId: decoded.id,
                tenantId: decoded.tenantId
            }, () => {
                next();
            });
        }
        catch (err) {
            return res.status(401).json({ error: 'Invalid identity token' });
        }
    };
}
/**
 * REQUIRE PERMISSION MIDDLEWARE
 */
/**
 * REQUIRE PERMISSION MIDDLEWARE
 */
function requirePermission(requiredPermission) {
    return (req, res, next) => {
        if (!req.user || !req.user.roles) {
            return res.status(401).json({ error: 'Authentication required' });
        }
        const userPermissions = new Set();
        req.user.roles.forEach((role) => {
            const perms = exports.ROLE_PERMISSIONS[role] || [];
            perms.forEach(p => userPermissions.add(p));
        });
        if (!userPermissions.has(requiredPermission)) {
            observability_1.logger.warn({
                userId: req.user.id,
                permission: requiredPermission,
                roles: req.user.roles
            }, '[AuthInternal] FORBIDDEN: Insufficient Permissions');
            return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
        }
        next();
    };
}
function signInternalToken(serviceName) {
    const secret = config_1.env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET not configured');
    }
    return jsonwebtoken_1.default.sign({ svc: serviceName }, secret, { expiresIn: '1h' });
}
/**
 * USER AUTH MIDDLEWARE (Public/User-Facing)
 */
function userAuth(options = {}) {
    return async (req, res, next) => {
        const { contextStorage } = require('@packages/utils');
        const authHeader = req.headers.authorization;
        const cookieToken = req.cookies?.token;
        // DEV BYPASS: Allow unauthorized access in local development for UI testing if enabled
        if (options.allowDevBypass && !authHeader && !cookieToken && process.env.NODE_ENV === 'development') {
            const mockUser = {
                id: 'mock-admin-id',
                email: 'dev@multiagent.local',
                tenantId: 'mock-tenant-id',
                roles: ['admin', 'user'],
            };
            const secret = config_1.env.JWT_SECRET;
            if (!secret) {
                throw new Error('JWT_SECRET not configured');
            }
            const token = jsonwebtoken_1.default.sign(mockUser, secret, { expiresIn: '15m' });
            req.headers.authorization = `Bearer ${token}`;
            req.user = mockUser;
            return contextStorage.run({
                requestId: req.requestId || 'dev-' + Math.random().toString(36).substring(7),
                userId: mockUser.id,
                tenantId: mockUser.tenantId
            }, () => {
                next();
            });
        }
        const token = cookieToken || (authHeader?.startsWith('Bearer ') ? authHeader.split(' ')[1] : null);
        if (!token) {
            return res.status(401).json({ error: 'Unauthorized: No token provided' });
        }
        try {
            // Enforce Redis Blacklist Check (Zero Trust)
            if (utils_1.redis.status === 'ready') {
                const isRevoked = await utils_1.redis.get(`revoked:${token}`);
                if (isRevoked) {
                    observability_1.logger.warn({ ip: req.ip }, '[AuthInternal] Blocked request using revoked token');
                    return res.status(401).json({ error: 'Token has been revoked' });
                }
            }
            const secret = config_1.env.JWT_SECRET;
            if (!secret) {
                throw new Error('JWT_SECRET not configured');
            }
            const decoded = jsonwebtoken_1.default.verify(token, secret);
            req.user = decoded;
            contextStorage.run({
                requestId: req.requestId || 'req-' + Math.random().toString(36).substring(7),
                userId: decoded.id,
                tenantId: decoded.tenantId
            }, () => {
                next();
            });
        }
        catch (err) {
            observability_1.logger.error({ err: err.message }, '[AuthInternal] User JWT verification failed');
            return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        }
    };
}
//# sourceMappingURL=index.js.map