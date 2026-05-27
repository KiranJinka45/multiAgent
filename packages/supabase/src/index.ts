import { createClient, type SupabaseClient } from '@supabase/supabase-js';
export type { SupabaseClient, PostgrestError } from '@supabase/supabase-js';

export function createClientComponentClient(): SupabaseClient {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dummy'
  );
}

export function createServerSupabaseClient(url: string, key: string): SupabaseClient {
  return createClient(url, key);
}

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321',
  process.env.SUPABASE_SERVICE_ROLE_KEY || 'dummy'
);
