import { createClient } from "@libs/supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function checkProject() {
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const projectId = "f94a47d8-8dc9-4803-be92-2fd0ec791181";

    const { data: project, error: pErr } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();

    if (pErr) {
        console.error("Error fetching project:", pErr);
        return;
    }

    console.log("PROJECT_DATA_START");
    console.log("ID:", project.id);
    console.log("Status:", project.status);
    console.log("Last Execution ID:", project.last_execution_id);
    console.log("Updated At:", project.updated_at);
    console.log("PROJECT_DATA_END");
}

checkProject();
