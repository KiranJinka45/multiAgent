/**
 * @packages/supabase
 * 
 * Shared Supabase client and utilities.
 */

export interface PostgrestError {
    message: string;
    details: string;
    hint: string;
    code: string;
}

export const supabase = {
    from: (table: string) => ({
        select: (query: string) => ({
            eq: (col: string, val: any) => ({
                single: async () => ({ data: null, error: null }),
                maybeSingle: async () => ({ data: null, error: null }),
            }),
            single: async () => ({ data: null, error: null }),
        }),
        insert: (data: any) => ({
            select: () => ({
                single: async () => ({ data: null, error: null }),
            }),
        }),
        update: (data: any) => ({
            eq: (col: string, val: any) => ({
                single: async () => ({ data: null, error: null }),
            }),
        }),
    }),
    auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
    }
} as any;

export const createClientComponentClient = () => supabase;
export const createServerComponentClient = () => supabase;
export const createRouteHandlerClient = () => supabase;
export const createMiddlewareClient = (opts?: any) => supabase;

// Compatibility Types
export type SupabaseClient = any;
