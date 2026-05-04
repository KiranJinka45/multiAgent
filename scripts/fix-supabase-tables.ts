import { createClient } from "@libs/supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function setupTables() {
    const supabase = createClient(supabaseUrl, serviceRoleKey);

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
        } else {
            console.log("Successfully setup tables via exec_sql.");
        }
    } else {
        console.log("Successfully setup tables.");
        console.log("Response:", data);
    }
}

setupTables();

