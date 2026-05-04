import { z } from 'zod';
import * as dotenv from 'dotenv';
import * as path from 'path';
import * as fs from 'fs';

let initialized = false;

// Find monorepo root .env by searching upwards
function loadEnv() {
  if (initialized) return;
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
export const commonSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  LOG_LEVEL: z.enum(['trace', 'debug', 'info', 'warn', 'error', 'fatal']).default('info'),
  
  // Infrastructure (Can be late-bound via Secrets Manager)
  DATABASE_URL: z.string().optional(),
  REDIS_URL: z.string().url().optional(),
  
  // Security
  JWT_SECRET: z.string().min(32).optional(),
  JWT_REFRESH_SECRET: z.string().min(32).optional(),
  INTERNAL_SERVICE_TOKEN: z.string().min(16).optional(),
  
  // Supabase (Service Role)
  SUPABASE_URL: z.string().url().optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().optional(),
  
  // Frontend / Public
  NEXT_PUBLIC_API_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_URL: z.string().url().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(10).optional(),
});

/**
 * Service-specific environment variables.
 */
export const serviceSchema = z.object({
  // Auth Service
  AUTH_SERVICE_PORT: z.coerce.number().default(4005),
  
  // Billing Service
  BILLING_SERVICE_PORT: z.coerce.number().default(4003),
  STRIPE_SECRET_KEY: z.string().optional(),
  STRIPE_WEBHOOK_SECRET: z.string().optional(),
  
  // Gateway
  GATEWAY_PORT: z.coerce.number().default(4080),

  
  // Core API
  CORE_API_PORT: z.coerce.number().default(4000),
  CORE_ENGINE_PORT: z.coerce.number().default(4001),

  // Infrastructure Links
  CORE_ENGINE_URL: z.string().url().default('http://localhost:3010'),
  CORE_ENGINE_EU_URL: z.string().url().optional(),
  PREVIEW_URL: z.string().url().default('http://localhost:3005'),
});


/**
 * Combined validation schema.
 */
export const envSchema = commonSchema.merge(serviceSchema);

/**
 * Validated environment object.
 * This will throw an error immediately on service startup if validation fails.
 */
export const env = envSchema.parse({
  ...process.env,
  // Ensure NODE_ENV is set for various checks
  NODE_ENV: process.env.NODE_ENV || 'development',
});

export type Env = z.infer<typeof envSchema>;

import { SecretProvider } from './secret-provider';

// Run initial validation
SecretProvider.validate();
