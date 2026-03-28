import { createClientComponentClient } from '@supabase/auth-helpers-nextjs';
import type { SupabaseClient } from '@supabase/auth-helpers-nextjs';

// Next.js hot-rebuilds clear standard module scope. 
// We use globalThis to securely cache the client across HMR events.
const globalForSupabase = globalThis as unknown as {
    __supabaseClientSingleton: SupabaseClient | undefined;
};

class SupabaseClientSingleton {
    private static sessionPromise: ReturnType<SupabaseClient['auth']['getSession']> | null = null;
    private static lastSessionFetchTime = 0;

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
                (window as unknown as { __SUPABASE_CLIENT__: SupabaseClient }).__SUPABASE_CLIENT__ = globalForSupabase.__supabaseClientSingleton;
            }

            // Patch getSession to deduplicate rapid multiple calls from StrictMode remounts
            const originalGetSession = globalForSupabase.__supabaseClientSingleton.auth.getSession.bind(globalForSupabase.__supabaseClientSingleton.auth);
            globalForSupabase.__supabaseClientSingleton.auth.getSession = async () => {
                const now = Date.now();
                // If a fetch is currently in flight or was just completed within 2 seconds, reuse it
                if (SupabaseClientSingleton.sessionPromise && (now - SupabaseClientSingleton.lastSessionFetchTime < 2000)) {
                    return SupabaseClientSingleton.sessionPromise;
                }
                SupabaseClientSingleton.lastSessionFetchTime = now;
                SupabaseClientSingleton.sessionPromise = originalGetSession();
                return SupabaseClientSingleton.sessionPromise;
            };

        } else {
            console.log('[SupabaseClient] Reusing existing singleton from globalThis (HMR resistant).');
        }
        return globalForSupabase.__supabaseClientSingleton;
    }
}

export const getSupabaseClient = () => SupabaseClientSingleton.getInstance();
