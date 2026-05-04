import { createClient } from "@libs/supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function inspectProjects() {
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data: cols, error: cErr } = await supabase.rpc('get_column_names', { table_name: 'projects' });

    // If RPC doesn't exist, try getting a single row and checking keys
    const { data: row, error: rErr } = await supabase.from('projects').select('*').limit(1).single();

    if (row) {
        console.log("Columns in projects:", Object.keys(row));
    } else {
        console.error("Error or no data:", rErr);
    }
}

inspectProjects();

