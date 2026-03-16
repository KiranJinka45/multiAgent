import { createClient } from '@supabase/supabase-js';
import { env } from "@config/env";

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('[SupabaseAdmin] Missing Supabase environment variables! URL or SERVICE_ROLE_KEY not found.');
}

export const supabaseAdmin = createClient(supabaseUrl || '', serviceRoleKey || '', {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});
