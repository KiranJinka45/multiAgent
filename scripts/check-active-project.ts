import { createClient } from "@libs/supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function checkProject() {
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const projectId = "9a4b7634-ab3f-43cd-8230-f0ab875820c9";

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
    console.log("Name:", project.name);
    console.log("Status:", project.status);
    console.log("Description:", project.description);
    console.log("Updated At:", project.updated_at);

    const { data: files, error: fErr } = await supabase
        .from('project_files')
        .select('path')
        .eq('project_id', projectId);

    console.log("Files:", files ? files.length : 0);
    if (files) {
        files.slice(0, 5).forEach(f => console.log(" -", f.path));
    }
    console.log("PROJECT_DATA_END");
}

checkProject();

