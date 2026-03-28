'use client';

import { createBrowserSupabaseClient } from '@packages/supabase';

/**
 * Next.js Client singleton for Supabase.
 * Hydrated by NEXT_PUBLIC_ environment variables owned by apps/web.
 */
export const supabase = createBrowserSupabaseClient({
  url: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
});
