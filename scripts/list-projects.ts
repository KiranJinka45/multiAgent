import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function listAll() {
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data, error } = await supabase.from('projects').select('id, name, status');
    if (error) {
        console.error(error);
        return;
    }
    console.log("PROJECTS_START");
    data.forEach(p => {
        console.log(`ID: ${p.id} | NAME: ${p.name} | STATUS: ${p.status}`);
    });
    console.log("PROJECTS_END");
}

listAll();
