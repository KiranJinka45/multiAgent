import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function updateStatus() {
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const projectId = "f94a47d8-8dc9-4803-be92-2fd0ec791181";

    const { data, error } = await supabase
        .from('projects')
        .update({ status: 'completed' })
        .eq('id', projectId)
        .select();

    if (error) {
        console.error("Update failed:", error.message);
    } else {
        console.log("Update success. New status:", data[0].status);
    }
}

updateStatus();
