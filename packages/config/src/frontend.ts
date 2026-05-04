import { env } from './env.js';

/**
 * Frontend-safe configuration.
 */
export const frontendConfig = {
    apiUrl: env.NEXT_PUBLIC_API_URL || '',
    supabaseUrl: env.NEXT_PUBLIC_SUPABASE_URL || '',
    supabaseAnonKey: env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
};

export const IS_PRODUCTION = env.NODE_ENV === 'production';
export const IS_DEVELOPMENT = env.NODE_ENV === 'development';

