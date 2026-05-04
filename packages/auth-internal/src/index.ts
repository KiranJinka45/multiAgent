import jwt from 'jsonwebtoken';
import { NextFunction } from 'express';
import { logger } from '@packages/observability';
import { env } from '@packages/config';
import { redis } from '@packages/utils';


// Remove top-level constant capture to ensure dynamic env lookup at runtime
// const JWT_SECRET = env.JWT_SECRET;
// const INTERNAL_TOKEN = env.INTERNAL_SERVICE_TOKEN;

export interface UserContext {
    id: string;
    email: string;
    tenantId: string;
    roles: string[];
}

export type Permission = 
    | 'agents:read' 
    | 'agents:write' 
    | 'missions:read' 
    | 'missions:write' 
    | 'projects:read'
    | 'projects:write'
    | 'logs:read'
    | 'billing:manage'
    | 'system:manage';

export const ROLE_PERMISSIONS: Record<string, Permission[]> = {
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
export function internalAuth(allowedServices?: string[]) {
    return (req: any, res: any, next: NextFunction) => {
        const { contextStorage } = require('@packages/utils');
        const internalToken = req.headers['x-internal-token'];
        const secret = env.INTERNAL_SERVICE_TOKEN;
        
        if (!internalToken || internalToken !== secret) {
            logger.warn({ path: req.path }, `[AuthInternal] REJECTED: Invalid Internal Service Token`);
            return res.status(401).json({ 
                error: 'Unauthorized', 
                message: 'Invalid or missing service token' 
            });
        }

        const authHeader = req.headers.authorization;
        
        // If we have a valid internal token but no user identity, we might be a system request
        if (!authHeader?.startsWith('Bearer ')) {
            // In development or for system tasks, we can inject a system user
            req.user = { id: 'system', email: 'system@multiagent.internal', tenantId: 'system', roles: ['admin'] };
            return contextStorage.run({
                requestId: (req as any).requestId || 'sys-' + Math.random().toString(36).substring(7),
                userId: 'system',
                tenantId: 'system'
            }, () => {
                next();
            });
        }

        const userToken = authHeader.split(' ')[1];
        try {
            const jwtSecret = env.JWT_SECRET;
            if (!jwtSecret) {
                throw new Error('JWT_SECRET not configured');
            }
            // If the userToken is actually the internalToken (sent by gateway in dev bypass), treat as system
            if (userToken === secret) {
                req.user = { id: 'system', email: 'system@multiagent.internal', tenantId: 'system', roles: ['admin'] };
                return contextStorage.run({
                    requestId: (req as any).requestId || 'sys-' + Math.random().toString(36).substring(7),
                    userId: 'system',
                    tenantId: 'system'
                }, () => {
                    next();
                });
            }

            const decoded = jwt.verify(userToken, jwtSecret) as unknown as UserContext;
            req.user = decoded;
            
            // Set Context
            contextStorage.run({
                requestId: (req as any).requestId || 'svc-' + Math.random().toString(36).substring(7),
                userId: decoded.id,
                tenantId: decoded.tenantId
            }, () => {
                next();
            });
        } catch (err: any) {
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
export function requirePermission(requiredPermission: Permission) {
    return (req: any, res: any, next: NextFunction) => {
        if (!req.user || !req.user.roles) {
            return res.status(401).json({ error: 'Authentication required' });
        }

        const userPermissions = new Set<Permission>();
        req.user.roles.forEach((role: string) => {
            const perms = ROLE_PERMISSIONS[role] || [];
            perms.forEach(p => userPermissions.add(p));
        });

        if (!userPermissions.has(requiredPermission)) {
            logger.warn({ 
                userId: req.user.id, 
                permission: requiredPermission,
                roles: req.user.roles 
            }, '[AuthInternal] FORBIDDEN: Insufficient Permissions');
            return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
        }

        next();
    };
}

export function signInternalToken(serviceName: string): string {
    const secret = env.JWT_SECRET;
    if (!secret) {
        throw new Error('JWT_SECRET not configured');
    }
    return jwt.sign({ svc: serviceName }, secret, { expiresIn: '1h' });
}

/**
 * USER AUTH MIDDLEWARE (Public/User-Facing)
 */
export function userAuth(options: { allowDevBypass?: boolean } = {}) {
    return async (req: any, res: any, next: NextFunction) => {
        const { contextStorage } = require('@packages/utils');
        const authHeader = req.headers.authorization;
        const cookieToken = req.cookies?.token;
        
        // DEV BYPASS: Allow unauthorized access in local development for UI testing if enabled
        console.log(`[AuthInternal] userAuth: allowDevBypass=${options.allowDevBypass}, authHeader=${!!authHeader}, nodeEnv=${process.env.NODE_ENV}`);
        if (options.allowDevBypass && !authHeader && !cookieToken && process.env.NODE_ENV === 'development') {
            const mockUser: UserContext = {
                id: 'mock-admin-id',
                email: 'dev@multiagent.local',
                tenantId: 'mock-tenant-id',
                roles: ['admin', 'user'],
            };
            
            const secret = env.JWT_SECRET;
            if (!secret) {
                throw new Error('JWT_SECRET not configured');
            }
            const token = jwt.sign(mockUser, secret, { expiresIn: '15m' });
            req.headers.authorization = `Bearer ${token}`;
            req.user = mockUser;

            return contextStorage.run({
                requestId: (req as any).requestId || 'dev-' + Math.random().toString(36).substring(7),
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
            if ((redis as any).status === 'ready') {
                const isRevoked = await redis.get(`revoked:${token}`);
                if (isRevoked) {
                    logger.warn({ ip: req.ip }, '[AuthInternal] Blocked request using revoked token');
                    return res.status(401).json({ error: 'Token has been revoked' });
                }
            }

            const secret = env.JWT_SECRET;
            if (!secret) {
                throw new Error('JWT_SECRET not configured');
            }
            const decoded = jwt.verify(token, secret) as unknown as UserContext;
            req.user = decoded;

            contextStorage.run({
                requestId: (req as any).requestId || 'req-' + Math.random().toString(36).substring(7),
                userId: decoded.id,
                tenantId: decoded.tenantId
            }, () => {
                next();
            });
        } catch (err: any) {
            logger.error({ err: err.message }, '[AuthInternal] User JWT verification failed');
            return res.status(401).json({ error: 'Unauthorized: Invalid token' });
        }
    };
}
