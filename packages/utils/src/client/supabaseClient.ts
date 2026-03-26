import { createBrowserSupabaseClient } from '@libs/supabase';

/**
 * Standard accessor for Supabase client in the frontend.
 * This satisfies the @lib/supabaseClient alias used by various pages.
 */
export function getSupabaseClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
  
  return createBrowserSupabaseClient({ url, anonKey });
}
