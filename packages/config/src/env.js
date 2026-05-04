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
Object.defineProperty(exports, "__esModule", { value: true });
exports.env = exports.envSchema = exports.serviceSchema = exports.commonSchema = void 0;
const zod_1 = require("zod");
const dotenv = __importStar(require("dotenv"));
const path = __importStar(require("path"));
const fs = __importStar(require("fs"));
let initialized = false;
// Find monorepo root .env by searching upwards
function loadEnv() {
    if (initialized)
        return;
    initialized = true;
    const currentDir = process.cwd();
    console.log(`[Config] Starting .env search from: ${currentDir}`);
    // 1. Check current directory first (Standard Node behavior)
    const localEnv = path.join(currentDir, '.env');
    if (fs.existsSync(localEnv)) {
        console.log(`[Config] FOUND LOCAL .env: ${localEnv}`);
        dotenv.config({ path: localEnv, override: true });
        return;
    }
    // 2. Search upwards for monorepo root .env
    let searchDir = currentDir;
    const root = path.parse(searchDir).root;
    while (searchDir !== root) {
        const envPath = path.join(searchDir, '.env');
        if (fs.existsSync(envPath)) {
            console.log(`[Config] FOUND UPROOT .env: ${envPath}`);
            dotenv.config({ path: envPath, override: true });
            return;
        }
        searchDir = path.dirname(searchDir);
    }
    console.warn('[Config] WARNING: No .env found. Falling back to Zod defaults.');
}
loadEnv();
/**
 * Common environment variables shared across all services.
 */
exports.commonSchema = zod_1.z.object({
    NODE_ENV: zod_1.z.enum(['development', 'production', 'test']).default('development'),
    LOG_LEVEL: zod_1.z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
    // Infrastructure (Can be late-bound via Secrets Manager)
    DATABASE_URL: zod_1.z.string().optional(),
    REDIS_URL: zod_1.z.string().url().optional(),
    // Security
    JWT_SECRET: zod_1.z.string().min(32).optional(),
    JWT_REFRESH_SECRET: zod_1.z.string().min(32).optional(),
    INTERNAL_SERVICE_TOKEN: zod_1.z.string().min(16).optional(),
    // Supabase (Service Role)
    SUPABASE_URL: zod_1.z.string().url().optional(),
    SUPABASE_SERVICE_ROLE_KEY: zod_1.z.string().optional(),
    // Frontend / Public
    NEXT_PUBLIC_API_URL: zod_1.z.string().url().optional(),
    NEXT_PUBLIC_SUPABASE_URL: zod_1.z.string().url().optional(),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: zod_1.z.string().min(10).optional(),
});
/**
 * Service-specific environment variables.
 */
exports.serviceSchema = zod_1.z.object({
    // Auth Service
    AUTH_SERVICE_PORT: zod_1.z.coerce.number().default(4005),
    // Billing Service
    BILLING_SERVICE_PORT: zod_1.z.coerce.number().default(4003),
    STRIPE_SECRET_KEY: zod_1.z.string().optional(),
    STRIPE_WEBHOOK_SECRET: zod_1.z.string().optional(),
    // Gateway
    GATEWAY_PORT: zod_1.z.coerce.number().default(4080),
    // Core API
    CORE_API_PORT: zod_1.z.coerce.number().default(4000),
    CORE_ENGINE_PORT: zod_1.z.coerce.number().default(4001),
    // Infrastructure Links
    CORE_ENGINE_URL: zod_1.z.string().url().default('http://localhost:3010'),
    PREVIEW_URL: zod_1.z.string().url().default('http://localhost:3005'),
});
/**
 * Combined validation schema.
 */
exports.envSchema = exports.commonSchema.merge(exports.serviceSchema);
/**
 * Validated environment object.
 * This will throw an error immediately on service startup if validation fails.
 */
exports.env = exports.envSchema.parse({
    ...process.env,
    // Ensure NODE_ENV is set for various checks
    NODE_ENV: process.env.NODE_ENV || 'development',
});
const secret_provider_1 = require("./secret-provider");
// Run initial validation
secret_provider_1.SecretProvider.validate();
//# sourceMappingURL=env.js.map