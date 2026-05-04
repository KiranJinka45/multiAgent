import { createClient } from "@libs/supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function tryExecSQL() {
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data, error } = await supabase.rpc('execute_sql', {
        sql_query: "ALTER TABLE projects ADD COLUMN IF NOT EXISTS last_execution_id TEXT;"
    });

    if (error) {
        console.error("RPC 'execute_sql' failed:", error.message);
    } else {
        console.log("SUCCESS:", data);
    }
}

tryExecSQL();

