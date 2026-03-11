import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function findFiles() {
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data, error } = await supabase
        .from('project_files')
        .select('project_id')
        .limit(100);

    if (error) {
        console.error(error);
        return;
    }

    const counts: Record<string, number> = {};
    data.forEach(f => {
        counts[f.project_id] = (counts[f.project_id] || 0) + 1;
    });

    console.log("Projects with files:");
    console.log(counts);
}

findFiles();
