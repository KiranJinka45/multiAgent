import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { SupabaseClient } from '@supabase/auth-helpers-nextjs';

// Next.js hot-rebuilds clear standard module scope. 
// We use globalThis to securely cache the client across HMR events.
const globalForSupabase = globalThis as unknown as {
    __supabaseClientSingleton: SupabaseClient | undefined;
};

class SupabaseClientSingleton {
    public static getInstance(): SupabaseClient {
        if (!globalForSupabase.__supabaseClientSingleton) {
            // Validate environment variables first
            if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
                console.error('[SupabaseClient] Missing Supabase environment variables! Re-check NEXT_PUBLIC_SUPABASE_URL & ANON_KEY.');
            }

            console.log('[SupabaseClient] Initializing singleton Supabase client instance.');
            globalForSupabase.__supabaseClientSingleton = createClientComponentClient({
                options: {
                    realtime: {
                        params: {
                            eventsPerSecond: 10
                        }
                    }
                }
            });

            // Make it available globally in browser for debugging window.__SUPABASE_CLIENT__
            if (typeof window !== 'undefined') {
                (window as any).__SUPABASE_CLIENT__ = globalForSupabase.__supabaseClientSingleton;
            }
        } else {
            console.log('[SupabaseClient] Reusing existing singleton from globalThis (HMR resistant).');
        }
        return globalForSupabase.__supabaseClientSingleton;
    }
}

export const getSupabaseClient = () => SupabaseClientSingleton.getInstance();
