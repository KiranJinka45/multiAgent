import { createClient } from "@libs/supabase/supabase-js";
import dotenv from "dotenv";
dotenv.config({ path: ".env.local" });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function testConnection() {
    console.log("Testing Supabase Connection...");
    console.log("URL:", supabaseUrl);

    if (!supabaseUrl || !supabaseKey) {
        console.error("Missing Supabase URL or Anon Key");
        return;
    }

    const supabase = createClient(supabaseUrl, supabaseKey);
    const { data, error } = await supabase.from('projects').select('id').limit(1);

    if (error) {
        console.error("Connection error (Anon Key):", error.message);
    } else {
        console.log("Connection successful (Anon Key)! Found", data.length, "projects.");
    }

    if (serviceRoleKey) {
        const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);
        const { data: adminData, error: adminError } = await supabaseAdmin.from('projects').select('id, name'); // Changed to select 'id, name'
        if (adminError) {
            console.error("Connection error (Service Role):", adminError.message);
        } else {
            console.log(`Connection successful (Service Role)! Found ${adminData.length} projects.`);
            adminData.forEach(p => console.log(`Project ID: ${p.id}, Name: ${p.name}`));
        }
    }
}

testConnection().then(() => console.log("Test finished.")).catch(err => console.error("Test failed:", err));

