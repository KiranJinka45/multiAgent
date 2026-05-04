import { createClient } from "@libs/supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function findProject() {
    console.log("Searching for projects...");
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data, error } = await supabase.from('projects').select('id, name').limit(5);

    if (error) {
        console.error("Error:", error.message);
        return;
    }

    if (data && data.length > 0) {
        data.forEach(p => {
            console.log("--- PROJECT FOUND ---");
            console.log(`ID: ${p.id}`);
            console.log(`NAME: ${p.name}`);
        });
    } else {
        console.log("No projects found.");
    }
}

findProject().then(() => console.log("Done."));

