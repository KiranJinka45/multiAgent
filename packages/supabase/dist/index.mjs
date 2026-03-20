// src/client.ts
import { createClient } from "@supabase/supabase-js";
var _browserClient = null;
function createBrowserSupabaseClient(config) {
  if (typeof window === "undefined") {
    return createClient(config.url, config.anonKey);
  }
  if (!_browserClient) {
    if (!config.url || !config.anonKey) {
      throw new Error("[Supabase SDK] Missing required configuration (url/anonKey)");
    }
    _browserClient = createClient(config.url, config.anonKey);
    console.log("[Supabase SDK] Initialized browser client singleton");
  }
  return _browserClient;
}
function createServerSupabaseClient(url, key) {
  if (!url || !key) {
    throw new Error("[Supabase SDK] Missing required server-side configuration");
  }
  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false
    }
  });
}
export {
  createBrowserSupabaseClient,
  createServerSupabaseClient
};
//# sourceMappingURL=index.mjs.map