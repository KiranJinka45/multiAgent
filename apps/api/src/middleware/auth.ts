import { NextFunction, Request, Response } from "express";
import { verifyToken } from "../utils/jwt";
import { requirePermission, Permission } from "@packages/auth-internal";

export interface AuthenticatedRequest extends Request {
    user?: {
        id: string;
        email: string;
        tenantId: string;
        roles: string[];
    };
}

export function requireAuth(
    req: AuthenticatedRequest,
    res: Response,
    next: NextFunction
) {
    try {
        let token = req.cookies?.access_token;

        if (!token && req.headers.authorization?.startsWith("Bearer ")) {
            token = req.headers.authorization.split(" ")[1];
        }

        if (!token) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        const payload = verifyToken(token);

        req.user = payload;
        next();
    } catch (error) {
        return res.status(401).json({ error: "Invalid or expired token" });
    }
}

export function requireRole(...roles: string[]) {
    return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
        if (!req.user) {
            return res.status(401).json({ error: "Unauthorized" });
        }

        if (!roles.some(role => req.user!.roles.includes(role))) {
            return res.status(403).json({ error: "Forbidden" });
        }

        next();
    };
}