import type { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { serverConfig } from '@packages/config';

export function internalAuth(allowedServices: string[]) {
    return (req: Request, res: Response, next: NextFunction) => {
        const apiKey = req.headers['x-internal-key'];
        if (apiKey === process.env.INTERNAL_AUTH_KEY) {
            next();
            return;
        }
        res.status(403).json({ error: 'Internal Auth Failed' });
        return;
    };
}

export function userAuth() {
    return (req: Request, res: Response, next: NextFunction) => {
        const token = req.cookies?.token || req.headers.authorization?.split(' ')[1];
        if (!token) {
            res.status(401).json({ error: 'Unauthorized' });
            return;
        }
        try {
            const decoded = jwt.verify(token, serverConfig.JWT_SECRET);
            (req as any).user = decoded;
            next();
        } catch (_err) {
            res.status(401).json({ error: 'Invalid Token' });
            return;
        }
    };
}
