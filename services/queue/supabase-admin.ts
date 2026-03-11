import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
    console.error('[SupabaseAdmin] Missing Supabase environment variables! URL or SERVICE_ROLE_KEY not found.');
}

export const supabaseAdmin = createClient(supabaseUrl || '', serviceRoleKey || '', {
    auth: {
        autoRefreshToken: false,
        persistSession: false
    }
});
