"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.supabase = void 0;
const supabase_1 = require("@packages/supabase");
/**
 * API-layer Supabase client (Service Role).
 * Hydrated by environment variables owned by apps/api.
 * This client has elevated privileges (bypassing RLS) and should
 * ONLY be used for server-side trusted operations.
 */
exports.supabase = (0, supabase_1.createServerSupabaseClient)(process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://localhost:54321', process.env.SUPABASE_SERVICE_ROLE_KEY || 'service-role-key-stub');
//# sourceMappingURL=supabase.js.map