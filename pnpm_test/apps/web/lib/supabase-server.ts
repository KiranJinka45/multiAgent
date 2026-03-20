import { createServerSupabaseClient } from '@multi-agent/supabase';

/**
 * Next.js Server-side factory for Supabase.
 * Hydrated by environment variables owned by apps/web.
 * Note: Always uses the service role key for server-side elevated access.
 */
export function createServerSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;

  if (!url || !key) {
    throw new Error("[Web App] Missing server-side Supabase environment variables");
  }

  return createServerSupabaseClient(url, key);
}
