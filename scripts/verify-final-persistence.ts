import { createClient } from "@libs/supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function verifyPersistence() {
    const projectId = "9a4b7634-ab3f-43cd-8230-f0ab875820c9";
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    console.log(`🔍 Verifying persistence for project ${projectId}...`);

    // 1. Check project status
    const { data: project, error: pError } = await supabase
        .from('projects')
        .select('status, updated_at')
        .eq('id', projectId)
        .single();

    if (pError) console.error("Error fetching project:", pError.message);
    else console.log(`Project Status: ${project.status}, Updated At: ${project.updated_at}`);

    // 2. Check files
    const { data: files, error: fError, count } = await supabase
        .from('project_files')
        .select('*', { count: 'exact' })
        .eq('project_id', projectId);

    if (fError) console.error("Error fetching files:", fError.message);
    else {
        console.log(`File Count: ${count}`);
        if (files && files.length > 0) {
            console.log("Sample files:");
            files.slice(0, 3).forEach(f => console.log(` - ${f.path}`));
        }
    }
}

verifyPersistence();

