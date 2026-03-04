import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function checkProject() {
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const projectId = "f94a47d8-8dc9-4803-be92-2fd0ec791181";

    const { data: project, error: pErr } = await supabase
        .from('projects')
        .select('*, project_files(*)')
        .eq('id', projectId)
        .single();

    if (pErr) {
        console.error("Error fetching project:", pErr);
        return;
    }

    console.log("Project Status:", project.status);
    console.log("File Count:", project.project_files?.length || 0);
    if (project.project_files && project.project_files.length > 0) {
        console.log("First few files:");
        project.project_files.slice(0, 5).forEach((f: any) => console.log(`- ${f.file_path}`));
    }
}

checkProject();
