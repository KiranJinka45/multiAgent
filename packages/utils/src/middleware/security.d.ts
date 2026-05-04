import { Request, Response, NextFunction, Router } from 'express';
/**
 * Standard Security Middleware Bundle
 */
export declare function createSecurityMiddleware(): Router;
/**
 * Double-Submit Cookie CSRF Protection
 */
export declare function createCsrfMiddleware(): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Agentic Payload Sanitizer
 * Scans request bodies for dangerous patterns (Shell injection, Prompt injection).
 */
export declare function createPayloadSanitizerMiddleware(): (req: Request, res: Response, next: NextFunction) => void;
/**
 * Helper to generate and set CSRF cookie
 */
export declare function setCsrfToken(res: Response): string;
//# sourceMappingURL=security.d.ts.map