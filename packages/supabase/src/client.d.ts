import { type SupabaseClient } from '@libs/supabase';
export type SupabaseConfig = {
    url: string;
    anonKey: string;
};
/**
 * Pure factory for creating a Supabase browser client.
 * Uses a singleton pattern to prevent multiple initializations in the browser.
 */
export declare function createBrowserSupabaseClient(config: SupabaseConfig): SupabaseClient;
/**
 * Pure factory for creating a Supabase server-side/admin client.
 * Always returns a fresh client for server-side operations (no singleton to avoid session leakage).
 */
export declare function createServerSupabaseClient(url: string, key: string): SupabaseClient;
