import { createClient } from "@libs/supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function findById() {
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('id', 'f94a47d8-8dc9-4803-be92-2fd0ec791181')
        .single();

    if (error) {
        console.error("NOT FOUND:", error.message);
    } else {
        console.log("FOUND:", data.name);
    }
}

findById();

