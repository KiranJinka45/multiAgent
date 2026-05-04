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
async function setupTables() {
    const supabase = (0, supabase_js_1.createClient)(supabaseUrl, serviceRoleKey);
    console.log("Attempting to setup 'projects', 'builds', and 'build_events' tables...");
    const sql = `
-- 1. Projects Table
CREATE TABLE IF NOT EXISTS projects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    user_id UUID, 
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- 2. Builds Table
CREATE TABLE IF NOT EXISTS builds (
    id UUID PRIMARY KEY,
    project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'created',
    current_stage TEXT,
    progress_percent INTEGER DEFAULT 0,
    message TEXT,
    tokens_used INTEGER DEFAULT 0,
    duration_ms INTEGER DEFAULT 0,
    cost_usd NUMERIC(10, 5) DEFAULT 0,
    preview_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    metadata JSONB DEFAULT '{}'
);

-- 3. Build Events Table
CREATE TABLE IF NOT EXISTS build_events (
    id BIGSERIAL PRIMARY KEY,
    execution_id UUID REFERENCES builds(id) ON DELETE CASCADE,
    type TEXT NOT NULL,
    agent_name TEXT,
    action TEXT,
    message TEXT,
    data JSONB DEFAULT '{}',
    timestamp TIMESTAMPTZ DEFAULT NOW()
);
    `;
    const { data, error } = await supabase.rpc('execute_sql', {
        sql_query: sql
    });
    if (error) {
        console.error("RPC Error:", error.message);
        console.log("\nAttempting alternative 'exec_sql'...");
        const { error: e2 } = await supabase.rpc('exec_sql', { sql_query: sql });
        if (e2) {
            console.error("Second attempt failed:", e2.message);
        }
        else {
            console.log("Successfully setup tables via exec_sql.");
        }
    }
    else {
        console.log("Successfully setup tables.");
        console.log("Response:", data);
    }
}
setupTables();
//# sourceMappingURL=fix-supabase-tables.js.map