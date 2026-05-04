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
async function addColumn() {
    const supabase = (0, supabase_js_1.createClient)(supabaseUrl, serviceRoleKey);
    // We try to add it using execution_sql RPC
    console.log("Attempting to add 'last_execution_id' column to 'projects' table...");
    // Most Supabase projects have a way to run SQL via RPC if configured
    const { data, error } = await supabase.rpc('execute_sql', {
        sql_query: "ALTER TABLE projects ADD COLUMN IF NOT EXISTS last_execution_id TEXT;"
    });
    if (error) {
        console.error("RPC Error:", error.message);
        console.error("Details:", error.details);
        console.error("Hint:", error.hint);
        console.log("\nAttempting alternative RPC names...");
        const altRPCs = ['exec_sql', 'run_sql', 'sql'];
        for (const rpcName of altRPCs) {
            console.log(`Trying RPC: ${rpcName}...`);
            const { error: e2 } = await supabase.rpc(rpcName, { sql: "SELECT 1" });
            if (!e2) {
                console.log(`RPC ${rpcName} seems to exist! Attempting migration...`);
                // Add logic here if one works
            }
        }
    }
    else {
        console.log("Successfully added column (or it already exists).");
        console.log("Response:", data);
    }
}
addColumn();
//# sourceMappingURL=add-column-fix.js.map