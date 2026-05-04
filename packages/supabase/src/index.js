"use strict";
/**
 * @packages/supabase
 *
 * Shared Supabase client and utilities.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.createMiddlewareClient = exports.createRouteHandlerClient = exports.createServerComponentClient = exports.createClientComponentClient = exports.supabase = void 0;
exports.supabase = {
    from: (table) => ({
        select: (query) => ({
            eq: (col, val) => ({
                single: async () => ({ data: null, error: null }),
                maybeSingle: async () => ({ data: null, error: null }),
            }),
            single: async () => ({ data: null, error: null }),
        }),
        insert: (data) => ({
            select: () => ({
                single: async () => ({ data: null, error: null }),
            }),
        }),
        update: (data) => ({
            eq: (col, val) => ({
                single: async () => ({ data: null, error: null }),
            }),
        }),
    }),
    auth: {
        getUser: async () => ({ data: { user: null }, error: null }),
        getSession: async () => ({ data: { session: null }, error: null }),
    }
};
const createClientComponentClient = () => exports.supabase;
exports.createClientComponentClient = createClientComponentClient;
const createServerComponentClient = () => exports.supabase;
exports.createServerComponentClient = createServerComponentClient;
const createRouteHandlerClient = () => exports.supabase;
exports.createRouteHandlerClient = createRouteHandlerClient;
const createMiddlewareClient = (opts) => exports.supabase;
exports.createMiddlewareClient = createMiddlewareClient;
//# sourceMappingURL=index.js.map