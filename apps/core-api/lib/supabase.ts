import { createServerSupabaseClient } from '@packages/packages/supabase/index';

/**
 * API-layer Supabase client (Service Role).
 * Hydrated by environment variables owned by apps/api.
 * This client has elevated privileges (bypassing RLS) and should 
 * ONLY be used for server-side trusted operations.
 */
export const supabase = createServerSupabaseClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
