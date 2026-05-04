"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IS_DEVELOPMENT = exports.IS_PRODUCTION = exports.frontendConfig = void 0;
const env_js_1 = require("./env.js");
/**
 * Frontend-safe configuration.
 */
exports.frontendConfig = {
    apiUrl: env_js_1.env.NEXT_PUBLIC_API_URL || '',
    supabaseUrl: env_js_1.env.NEXT_PUBLIC_SUPABASE_URL || '',
    supabaseAnonKey: env_js_1.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
};
exports.IS_PRODUCTION = env_js_1.env.NODE_ENV === 'production';
exports.IS_DEVELOPMENT = env_js_1.env.NODE_ENV === 'development';
//# sourceMappingURL=frontend.js.map