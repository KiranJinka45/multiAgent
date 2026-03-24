import { createClient } from "@libs/supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function findLatest() {
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data, error } = await supabase
        .from('projects')
        .select('id, name, status, updated_at')
        .order('updated_at', { ascending: false })
        .limit(10);

    if (error) {
        console.error(error);
        return;
    }

    console.log("RECENT_PROJECTS_START");
    data.forEach(p => {
        console.log(`ID: ${p.id} | STATUS: ${p.status} | UPDATED: ${p.updated_at} | NAME: ${p.name}`);
    });
    console.log("RECENT_PROJECTS_END");
}

findLatest();
