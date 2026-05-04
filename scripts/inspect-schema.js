"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_js_1 = require("@libs/supabase/supabase-js");
const dotenv = __importStar(require("dotenv"));
dotenv.config({ path: ".env.local" });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
async function checkSchema() {
    const supabase = (0, supabase_js_1.createClient)(supabaseUrl, serviceRoleKey);
    console.log("Checking user_profiles columns...");
    const { data: profileCols, error: profileErr } = await supabase
        .from('user_profiles')
        .select('*')
        .limit(1);
    if (profileErr) {
        console.error("Error fetching user_profiles:", profileErr.message);
    }
    else if (profileCols && profileCols.length > 0) {
        console.log("Columns in user_profiles:", Object.keys(profileCols[0]));
    }
    else {
        console.log("user_profiles is empty, cannot infer columns via select *");
    }
    console.log("\nChecking publications (Realtime status)...");
    // We can query the realtime publication status via RPC or just try a subscription in a test script, 
    // but the best way is usually the dashboard.
    // However, we can check if the extension is enabled.
}
checkSchema().then(() => console.log("Done."));
//# sourceMappingURL=inspect-schema.js.map