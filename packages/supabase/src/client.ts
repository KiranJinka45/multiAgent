import { createClient, type SupabaseClient } from '@supabase/supabase-js';
export type { SupabaseClient };

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
