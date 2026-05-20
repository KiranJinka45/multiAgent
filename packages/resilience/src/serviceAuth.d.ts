import type { Request, Response, NextFunction } from 'express';
/**
 * Sign a short-lived token for service-to-service communication
 */
export declare function signServiceToken(serviceName: string): string;
/**
 * Middleware to verify service-to-service identity
 */
export declare function serviceAuth(allowedServices: string[]): (req: Request, res: Response, next: NextFunction) => void | Response<any, Record<string, any>>;
//# sourceMappingURL=serviceAuth.d.ts.map