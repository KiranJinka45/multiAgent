import { createClient } from "@libs/supabase/supabase-js";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

async function listRPCs() {
    const supabase = createClient(supabaseUrl, serviceRoleKey);
    const { data, error } = await supabase.rpc('get_functions'); // This is a shot in the dark, might not exist

    if (error) {
        console.log("RPC 'get_functions' failed, as expected.");
        // Try querying information_schema if we have access via a custom RPC that allows arbitrary queries (rare/insecure)
    } else {
        console.log("RPC Functions:", data);
    }
}

listRPCs();

