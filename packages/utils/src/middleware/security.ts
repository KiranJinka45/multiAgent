import express, { Router } from 'express';
import type { Request, Response, NextFunction } from 'express';
import helmet from 'helmet';
import cors from 'cors';
import { v4 as uuidv4 } from 'uuid';
import { randomBytes } from 'crypto';
import { logger } from '@packages/observability';
import { contextStorage } from '../context.js';


/**
 * Standard Security Middleware Bundle
 */
export function createSecurityMiddleware(): Router {
  const router = Router();

  // 1. Raw Stream size validator (Priority 2) - Enforces raw TCP/HTTP limit before body parser
  router.use(validateRawPayloadSizeLimit());

  // 2. Request Body Limits (Production Safety Phase 8)
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
    origin: (process.env.ALLOWED_ORIGINS?.split(',') || ['*']),
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID', 'X-Internal-Token', 'x-internal-token', 'X-XSRF-TOKEN', 'x-xsrf-token'],
    credentials: true,
  }));

  // 3. CSRF Protection (Institutional Stewardship Era)
  router.use(createCsrfMiddleware());

  // 3. Request ID middleware for tracing (AsyncLocalStorage Integrated)
  router.use((req: Request, res: Response, next: NextFunction) => {
    const requestId = (req.header('X-Request-ID') || uuidv4()) as string;
    
    // Normalize headers
    req.headers['x-request-id'] = requestId;
    res.setHeader('X-Request-ID', requestId);

    // Run within AsyncLocalStorage context
    contextStorage.run({ requestId }, () => {
        return next();
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
    return next();
  });

  return router;
}

/**
 * Double-Submit Cookie CSRF Protection (Angular Compatible)
 */
export function createCsrfMiddleware(): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    // 1. Skip for read-only methods (Safe methods per RFC 7231)
    if (['GET', 'HEAD', 'OPTIONS'].includes(req.method)) {
      return next();
    }

    // 2. Skip for internal service-to-service requests (Stewardship Era Bypass)
    const internalToken = req.headers['x-internal-token'];
    if (internalToken && internalToken === process.env.INTERNAL_SERVICE_TOKEN) {
      return next();
    }

    // 3. Validate Double-Submit Token
    // We look for 'XSRF-TOKEN' cookie and 'X-XSRF-TOKEN' header (Angular defaults)
    const csrfCookie = req.cookies?.['XSRF-TOKEN'];
    const csrfHeader = req.headers['x-xsrf-token'];

    if (!csrfCookie || !csrfHeader || csrfCookie !== csrfHeader) {
      logger.warn({
        method: req.method,
        url: req.url,
        hasCookie: !!csrfCookie,
        hasHeader: !!csrfHeader,
        match: csrfCookie === csrfHeader,
        requestId: req.headers['x-request-id']
      }, '[SECURITY] CSRF Validation Failed - Blocking Request');
      
      return res.status(403).json({ 
        error: 'Forbidden', 
        message: 'Invalid or missing CSRF token' 
      });
    }

    return next();
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
    return next();
  };
}

/**
 * Helper to generate and set CSRF cookie
 */
export function setCsrfToken(res: Response): string {
  const token = randomBytes(32).toString('hex');
  res.cookie('XSRF-TOKEN', token, {
    httpOnly: false, // REQUIRED for Angular to read the cookie and set X-XSRF-TOKEN header
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/'
  });
  return token;
}

/**
 * Zero-dependency, stream-level raw payload size validator (Priority 2).
 * Rejects payloads exceeding ZTAN 1MB ceiling before JSON parsing or tokenization executes.
 * Integrates socket termination to mitigate Content-Length spoofing attacks.
 */
export function validateRawPayloadSizeLimit(): (req: Request, res: Response, next: NextFunction) => void {
  return (req: Request, res: Response, next: NextFunction) => {
    // 1. Inspect Content-Length header
    const contentLength = req.headers['content-length'];
    if (contentLength) {
      const parsedLength = parseInt(contentLength, 10);
      if (!isNaN(parsedLength) && parsedLength > 1000000) {
        logger.warn({ contentLength: parsedLength }, '[SECURITY] Content-Length limit exceeded (1MB maximum)');
        return res.status(413).json({
          error: 'Payload Too Large',
          message: 'Payload exceeds the strict ZTAN 1MB byte limit before parsing.'
        });
      }
    }

    // 2. Track real streaming bytes received to block socket spoofing
    let bytesReceived = 0;
    req.on('data', (chunk: Buffer) => {
      bytesReceived += chunk.length;
      if (bytesReceived > 1000000) {
        logger.warn({ bytesReceived }, '[SECURITY] Real stream bytes limit exceeded (1MB maximum)');
        req.destroy(); // Instantly destroy connection to block DoS
      }
    });

    return next();
  };
}

