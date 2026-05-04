// apps/api/src/middleware/rbac.ts
import { Request, Response, NextFunction } from 'express';
import { PrismaClient } from '@packages/db';

const prisma = new PrismaClient();

/**
 * Middleware to enforce ADMIN role.
 * Assumes the user ID is available on the request (e.g., from auth middleware).
 */
export async function requireAdmin(req: Request, res: Response, next: NextFunction) {
    const userId = (req as any).user?.id;

    if (!userId) {
        return res.status(401).json({ error: 'Authentication required' });
    }

    try {
        const user = await prisma.user.findUnique({
            where: { id: userId },
            select: { role: true }
        });

        if (!user || user.role !== 'ADMIN') {
            console.warn(`[RBAC] Access denied for user ${userId} (Role: ${user?.role || 'NONE'})`);
            return res.status(403).json({ error: 'Admin permissions required' });
        }

        next();
    } catch (error) {
        console.error('[RBAC] Middleware error:', error);
        res.status(500).json({ error: 'Internal server error during authorization' });
    }
}

