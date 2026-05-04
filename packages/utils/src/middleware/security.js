"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createSecurityMiddleware = createSecurityMiddleware;
exports.createCsrfMiddleware = createCsrfMiddleware;
exports.createPayloadSanitizerMiddleware = createPayloadSanitizerMiddleware;
exports.setCsrfToken = setCsrfToken;
const express_1 = __importStar(require("express"));
const helmet_1 = __importDefault(require("helmet"));
const cors_1 = __importDefault(require("cors"));
const uuid_1 = require("uuid");
const crypto_1 = require("crypto");
const observability_1 = require("@packages/observability");
const context_1 = require("../context");
/**
 * Standard Security Middleware Bundle
 */
function createSecurityMiddleware() {
    const router = (0, express_1.Router)();
    // 1. Request Body Limits (Production Safety Phase 8)
    router.use(express_1.default.json({ limit: '1mb' }));
    router.use(express_1.default.urlencoded({ limit: '1mb', extended: true }));
    // 2. Helmet for security headers (Moderate Tuning)
    router.use((0, helmet_1.default)({
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
    router.use((0, cors_1.default)({
        origin: process.env.ALLOWED_ORIGINS?.split(',') || '*',
        methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'X-Request-ID', 'X-Internal-Token', 'x-internal-token'],
        credentials: true,
    }));
    // 3. Request ID middleware for tracing (AsyncLocalStorage Integrated)
    router.use((req, res, next) => {
        const requestId = (req.header('X-Request-ID') || (0, uuid_1.v4)());
        // Normalize headers
        req.headers['x-request-id'] = requestId;
        res.setHeader('X-Request-ID', requestId);
        // Run within AsyncLocalStorage context
        context_1.contextStorage.run({ requestId }, () => {
            next();
        });
    });
    // 4. Logging for every request (Standardized)
    router.use((req, res, next) => {
        const start = Date.now();
        res.on('finish', () => {
            const duration = Date.now() - start;
            observability_1.logger.info({
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
function createCsrfMiddleware() {
    return (req, res, next) => {
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
            observability_1.logger.warn({
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
function createPayloadSanitizerMiddleware() {
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
    return (req, res, next) => {
        if (['POST', 'PUT', 'PATCH'].includes(req.method) && req.body) {
            const bodyString = JSON.stringify(req.body);
            for (const pattern of DANGEROUS_PATTERNS) {
                if (pattern.test(bodyString)) {
                    observability_1.logger.warn({
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
function setCsrfToken(res) {
    const token = (0, crypto_1.randomBytes)(32).toString('hex');
    res.cookie('csrf-token', token, {
        httpOnly: false, // Must be readable by frontend if they don't have an API to get it
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/'
    });
    return token;
}
//# sourceMappingURL=security.js.map