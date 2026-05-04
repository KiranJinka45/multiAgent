import { Request, Response, NextFunction } from 'express';
/**
 * RBAC Middleware: Enforces role-based access control.
 */
export declare const authorize: (requiredRole: "ADMIN" | "DEV" | "VIEWER") => (req: Request, res: Response, next: NextFunction) => Promise<void | Response<any, Record<string, any>>>;
