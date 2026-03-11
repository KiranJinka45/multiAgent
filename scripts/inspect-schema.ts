import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function checkSchema() {
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    console.log("Checking user_profiles columns...");
    const { data: profileCols, error: profileErr } = await supabase
        .from('user_profiles')
        .select('*')
        .limit(1);

    if (profileErr) {
        console.error("Error fetching user_profiles:", profileErr.message);
    } else if (profileCols && profileCols.length > 0) {
        console.log("Columns in user_profiles:", Object.keys(profileCols[0]));
    } else {
        console.log("user_profiles is empty, cannot infer columns via select *");
    }

    console.log("\nChecking publications (Realtime status)...");
    // We can query the realtime publication status via RPC or just try a subscription in a test script, 
    // but the best way is usually the dashboard.
    // However, we can check if the extension is enabled.
}

checkSchema().then(() => console.log("Done."));
