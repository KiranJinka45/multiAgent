/**
 * @packages/core-engine/mock-api
 * 
 * Mock API adapter for testing and system bootstrap.
 */

import { db, PrismaClient } from '@packages/db';
import { getSupabaseClient as supabase } from '@packages/utils';
import { logger } from '@packages/observability';

export const getSupabaseClient = () => supabase();
export interface SupabaseClient {
    from: (table: string) => any;
}
export const SupabaseClient = class MockSupabaseClient implements SupabaseClient {
    from(table: string) { return {} as any; }
};

export const mockProjectApi = {
    get: async (id: string) => ({ id, name: 'Mock Project' }),
    listFiles: async (id: string) => [],
    readFile: async (id: string, path: string) => '',
    writeFile: async (id: string, path: string, content: string) => {},
};
