import { env } from './env.js';

/**
 * Backend/server-only configuration.
 * Do NOT import this from the frontend.
 */
export const serverConfig = {
    NODE_ENV: env.NODE_ENV,
    PORT: env.CORE_API_PORT,
    DATABASE_URL: env.DATABASE_URL,
    REDIS_URL: env.REDIS_URL,
    SUPABASE_URL: env.SUPABASE_URL || '',
    SUPABASE_SERVICE_ROLE_KEY: env.SUPABASE_SERVICE_ROLE_KEY || '',
    CORE_ENGINE_URL: env.CORE_ENGINE_URL,
    PREVIEW_URL: env.PREVIEW_URL,
    
    // Legacy mapping support
    databaseUrl: env.DATABASE_URL,
    supabaseServiceKey: env.SUPABASE_SERVICE_ROLE_KEY,
};

export const config = serverConfig;