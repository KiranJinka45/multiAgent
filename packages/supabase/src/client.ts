import { createClient, type SupabaseClient, type RealtimePostgresChangesPayload, type RealtimeChannel } from '@supabase/supabase-js';
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
export type { SupabaseClient, RealtimePostgresChangesPayload, RealtimeChannel };
export { createClientComponentClient };

export type SupabaseConfig = {
  url: string;
  anonKey: string;
};

let _browserClient: SupabaseClient | null = null;

/**
 * Pure factory for creating a Supabase browser client.
 * Uses a singleton pattern to prevent multiple initializations in the browser.
 */
export function createBrowserSupabaseClient(config: SupabaseConfig): SupabaseClient {
  if (typeof window === 'undefined') {
    return createClient(config.url, config.anonKey);
  }

  if (!_browserClient) {
    if (!config.url || !config.anonKey) {
      throw new Error("[Supabase SDK] Missing required configuration (url/anonKey)");
    }
    _browserClient = createClient(config.url, config.anonKey);
    console.log("[Supabase SDK] Initialized browser client singleton");
  }

  return _browserClient;
}

/**
 * Pure factory for creating a Supabase server-side/admin client.
 * Always returns a fresh client for server-side operations (no singleton to avoid session leakage).
 */
export function createServerSupabaseClient(url: string, key: string): SupabaseClient {
  if (!url || !key) {
    throw new Error("[Supabase SDK] Missing required server-side configuration");
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}

/**
 * Mock/Direct implementation of createRouteHandlerClient for Next.js.
 * In a real Next.js app, this would use @supabase/auth-helpers-nextjs or @supabase/ssr.
 */
export function createRouteHandlerClient({ cookies }: { cookies: () => { toString: () => string } }): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    },
    global: {
        headers: {
            // This is a simplified version; real one would handle cookies correctly
            Cookie: typeof cookies === 'function' ? cookies().toString() : ''
        }
    }
  });
}

/**
 * Mock/Direct implementation of createMiddlewareClient for Next.js middleware.
 */
export function createMiddlewareClient(_options: { req: unknown; res: unknown }): SupabaseClient {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

    return createClient(url, key, {
        auth: {
            persistSession: false,
            autoRefreshToken: false,
            detectSessionInUrl: false
        }
    });
}

/**
 * Convenience helper for server-side/build-time clients using env vars.
 */
export function getSupabaseClient(): SupabaseClient {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    throw new Error("[Supabase SDK] Missing environment variables (SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY)");
  }
  
  return createServerSupabaseClient(url, key);
}
