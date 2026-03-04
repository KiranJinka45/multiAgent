import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function addColumn() {
    const supabase = createClient(supabaseUrl, serviceRoleKey);

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
    } else {
        console.log("Successfully added column (or it already exists).");
        console.log("Response:", data);
    }
}

addColumn();
