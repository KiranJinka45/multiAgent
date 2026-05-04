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
export declare const supabase: any;
export declare const createClientComponentClient: () => any;
export declare const createServerComponentClient: () => any;
export declare const createRouteHandlerClient: () => any;
export declare const createMiddlewareClient: (opts?: any) => any;
export type SupabaseClient = any;
//# sourceMappingURL=index.d.ts.map