"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.config = exports.serverConfig = void 0;
const env_js_1 = require("./env.js");
/**
 * Backend/server-only configuration.
 * Do NOT import this from the frontend.
 */
exports.serverConfig = {
    NODE_ENV: env_js_1.env.NODE_ENV,
    PORT: env_js_1.env.CORE_API_PORT,
    DATABASE_URL: env_js_1.env.DATABASE_URL,
    REDIS_URL: env_js_1.env.REDIS_URL,
    SUPABASE_URL: env_js_1.env.SUPABASE_URL || '',
    SUPABASE_SERVICE_ROLE_KEY: env_js_1.env.SUPABASE_SERVICE_ROLE_KEY || '',
    CORE_ENGINE_URL: env_js_1.env.CORE_ENGINE_URL,
    PREVIEW_URL: env_js_1.env.PREVIEW_URL,
    // Legacy mapping support
    databaseUrl: env_js_1.env.DATABASE_URL,
    supabaseServiceKey: env_js_1.env.SUPABASE_SERVICE_ROLE_KEY,
};
exports.config = exports.serverConfig;
//# sourceMappingURL=backend.js.map