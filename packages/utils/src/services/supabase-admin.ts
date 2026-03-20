import { createServerSupabaseClient } from '@libs/supabase';
import { type SupabaseClient } from '@libs/supabase';

/**
 * Internal Admin client factory.
 * NOTE: Calling apps should manage their own singletons to prevent env leakage.
 * This util now requires explicit URL and Key to adhere to monorepo safety rules.
 */
export function getSupabaseAdmin(url?: string, key?: string): SupabaseClient {
    const finalUrl = url || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const finalKey = key || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    if (!finalUrl || !finalKey) {
        throw new Error("[SupabaseAdmin] Both URL and Service Role Key are required. Provide them as arguments or set SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY env vars.");
    }
    return createServerSupabaseClient(finalUrl, finalKey);
}

/**
 * @deprecated Use getSupabaseAdmin(url, key) from the app layer.
 * Global singletons in shared packages are being removed for monorepo safety.
 */
export const supabaseAdmin = null as any;
