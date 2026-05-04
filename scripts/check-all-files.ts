import { createClient } from "@libs/supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function checkTotalFiles() {
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { count, error } = await supabase
        .from('project_files')
        .select('*', { count: 'exact', head: true });

    if (error) {
        console.error(error);
    } else {
        console.log("Total Project Files in DB:", count);
    }
}

checkTotalFiles();

