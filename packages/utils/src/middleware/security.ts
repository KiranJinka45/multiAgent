import express, { Request, Response, NextFunction, Router } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';
import { logger } from '@packages/observability';
import { contextStorage } from '../context';


/**
 * Standard Security Middleware Bundle
 */
export function createSecurityMiddleware(): Router {
  const router = Router();

  // 1. Request Body Limits (Production Safety Phase 8)
  router.use(express.json({ limit: '1mb' }));
  router.use(express.urlencoded({ limit: '1mb', extended: true }));

  // 2. Helmet for security headers (Moderate Tuning)
  router.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'", "'unsafe-inline'", "https://apis.google.com"],
        styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        imgSrc: ["'self'", "data:", "https://*.stripe.com"],
        connectSrc: ["'self'", "https://*.stripe.com", "wss://*.multiagent.com"],
        frameAncestors: ["'none'"],
        upgradeInsecureRequests: [],
      },
    },
    crossOriginResourcePolicy: { policy: "cross-origin" }
  }));

  // 2. CORS configuration (Production Ready)
  router.use(cors({
    origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID', 'X-Internal-Token', 'x-internal-token'],
    credentials: true,
  }));

  // 3. Request ID middleware for tracing (AsyncLocalStorage Integrated)
  router.use((req: Request, res: Response, next: NextFunction) => {
    const requestId = (req.header('X-Request-ID') || uuidv4()) as string;
    
    // Normalize headers
    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-ID', requestId);

    // Run within AsyncLocalStorage context
    contextStorage.run({ requestId }, () => {
        next();
    });
  });


  // 4. Logging for every request (Standardized)
  router.use((req: Request, res: Response, next: NextFunction) => {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      logger.info({
        method: req.method,
        url: req.url,
        status: res.statusCode,
        duration: `${duration}ms`,
        requestId: req.headers['x-request-id'],
      }, `[Security] Request Processed`);
    });
    next();
  });

  return router;
}

/**
 * Double-Submit Cookie CSRF Protection
 */
export function createCsrfMiddleware(): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    // 1. Skip for read-only methods (Safe methods per RFC 7231)
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    // 2. Skip for internal service-to-service requests
    const internalToken = req.headers['x-internal-token'];
    if (internalToken && internalToken === process.env.INTERNAL_SERVICE_TOKEN) {
      return next();
    }

    // 3. Validate Double-Submit Token
    const csrfCookie = req.cookies?.['csrf-token'];
    const csrfHeader = req.headers['x-csrf-token'];

    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      logger.warn({
        method: req.method,
        url: req.url,
        hasCookie: !!csrfCookie,
        hasHeader: !!csrfHeader,
        match: csrfCookie === csrfHeader
      }, '[SECURITY] CSRF Validation Failed');
      
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: 'Invalid or missing CSRF token' 
      });
    }

    next();
  };
}

/**
 * Agentic Payload Sanitizer
 * Scans request bodies for dangerous patterns (Shell injection, Prompt injection).
 */
export function createPayloadSanitizerMiddleware(): (req: Request, res: Response, next: NextFunction) => void {
  const DANGEROUS_PATTERNS = [
    // Shell Injection
    /rm\s+-rf/i,
    /drop\s+table/i,
    /;\s*nc\s+/i,
    /bash\s+-i/i,
    // Prompt Injection (Heuristics)
    /ignore\s+previous\s+instructions/i,
    /system\s+role:\s+admin/i,
    /output\s+the\s+full\s+prompt/i
  ];

  return (req: Request, res: Response, next: NextFunction) => {
    if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
      const bodyString = JSON.stringify(req.body);

      for (const pattern of DANGEROUS_PATTERNS) {
        if (pattern.test(bodyString)) {
          logger.warn({ 
            pattern: pattern.source,
            requestId: req.headers['x-request-id']
          }, '[SECURITY] Malicious Payload Detected');

          return res.status(403).json({
            error: 'Security Violation',
            message: 'Malicious payload patterns detected and blocked.'
          });
        }
      }
    }
    next();
  };
}

/**
 * Helper to generate and set CSRF cookie
 */
export function setCsrfToken(res: Response): string {
  const token = randomBytes(32).toString('hex');
  res.cookie('csrf-token', token, {
    httpOnly: false, // Must be readable by frontend if they don't have an API to get it
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });
  return token;
}
