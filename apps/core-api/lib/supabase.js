"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
const index_1 = require("@packages/packages/supabase/index");
/**
 * API-layer Supabase client (Service Role).
 * Hydrated by environment variables owned by apps/api.
 * This client has elevated privileges (bypassing RLS) and should
 * ONLY be used for server-side trusted operations.
 */
exports.supabase = (0, index_1.createServerSupabaseClient)(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
//# sourceMappingURL=supabase.js.map