var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  createBrowserSupabaseClient: () => createBrowserSupabaseClient,
  createServerSupabaseClient: () => createServerSupabaseClient
});
module.exports = __toCommonJS(index_exports);

// src/client.ts
var import_supabase_js = require("@supabase/supabase-js");
var _browserClient = null;
function createBrowserSupabaseClient(config) {
  if (typeof window === "undefined") {
    return (0, import_supabase_js.createClient)(config.url, config.anonKey);
  }
  if (!_browserClient) {
    if (!config.url || !config.anonKey) {
      throw new Error("[Supabase SDK] Missing required configuration (url/anonKey)");
    }
    _browserClient = (0, import_supabase_js.createClient)(config.url, config.anonKey);
    console.log("[Supabase SDK] Initialized browser client singleton");
  }
  return _browserClient;
}
function createServerSupabaseClient(url, key) {
  if (!url || !key) {
    throw new Error("[Supabase SDK] Missing required server-side configuration");
  }
  return (0, import_supabase_js.createClient)(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  createBrowserSupabaseClient,
  createServerSupabaseClient
});
//# sourceMappingURL=index.js.map