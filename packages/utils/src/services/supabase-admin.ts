import '../config/env';
import { createServerSupabaseClient } from '@libs/supabase';
import { type SupabaseClient } from '@libs/supabase';

/**
 * Internal Admin client factory.
 * NOTE: Calling apps should manage their own singletons to prevent env leakage.
 * This util now requires explicit URL and Key to adhere to monorepo safety rules.
 */
let _admin: SupabaseClient | null = null;

export function getSupabaseAdmin(url?: string, key?: string): SupabaseClient {
    if (!url && !key && _admin) return _admin;
    
    const finalUrl = url || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
    const finalKey = key || process.env.SUPABASE_SERVICE_ROLE_KEY || '';
    
    if (!finalUrl || !finalKey) {
        throw new Error("[SupabaseAdmin] Both URL and Service Role Key are required. Provide them as arguments or set SUPABASE_URL/SUPABASE_SERVICE_ROLE_KEY env vars.");
    }
    
    const client = createServerSupabaseClient(finalUrl, finalKey);
    if (!url && !key) _admin = client;
    return client;
}

/**
 * @deprecated Use getSupabaseAdmin() from the app layer.
 * Global singleton is now lazy-loaded to prevent boot-time environment errors.
 */
export const supabaseAdmin = new Proxy({} as SupabaseClient, {
    get: (target, prop) => {
        return (getSupabaseAdmin() as any)[prop];
    }
});
