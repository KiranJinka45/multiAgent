"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_js_1 = require("@libs/supabase/supabase-js");
const dotenv_1 = __importDefault(require("dotenv"));
dotenv_1.default.config({ path: ".env.local" });
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
    const supabase = (0, supabase_js_1.createClient)(supabaseUrl, supabaseKey);
    const { data, error } = await supabase.from('projects').select('id').limit(1);
    if (error) {
        console.error("Connection error (Anon Key):", error.message);
    }
    else {
        console.log("Connection successful (Anon Key)! Found", data.length, "projects.");
    }
    if (serviceRoleKey) {
        const supabaseAdmin = (0, supabase_js_1.createClient)(supabaseUrl, serviceRoleKey);
        const { data: adminData, error: adminError } = await supabaseAdmin.from('projects').select('id, name'); // Changed to select 'id, name'
        if (adminError) {
            console.error("Connection error (Service Role):", adminError.message);
        }
        else {
            console.log(`Connection successful (Service Role)! Found ${adminData.length} projects.`);
            adminData.forEach(p => console.log(`Project ID: ${p.id}, Name: ${p.name}`));
        }
    }
}
testConnection().then(() => console.log("Test finished.")).catch(err => console.error("Test failed:", err));
//# sourceMappingURL=test-supabase.js.map