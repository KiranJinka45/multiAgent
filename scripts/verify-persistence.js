"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_admin_1 = require("../services/supabase-admin");
async function verify() {
    console.log("🔍 Verifying Persistence Schema...");
    const tables = ['projects', 'builds', 'build_events'];
    let allExist = true;
    for (const table of tables) {
        // Try a limit 0 select to check for existence
        const { error } = await supabase_admin_1.supabaseAdmin.from(table).select('*').limit(0);
        if (error) {
            if (error.code === 'PGRST204' || error.message.includes('not found')) {
                console.error(`❌ Table '${table}' MISSING!`);
            }
            else {
                console.error(`⚠️ Table '${table}' error: ${error.message} (Code: ${error.code})`);
            }
            allExist = false;
        }
        else {
            console.log(`✅ Table '${table}' exists.`);
        }
    }
    if (allExist) {
        console.log("\n🚀 Persistence Store is ready!");
        process.exit(0);
    }
    else {
        console.log("\n🛑 Persistence Store is incomplete. Please run 'scripts/migrations.sql' in Supabase SQL Editor.");
        process.exit(1);
    }
}
verify();
//# sourceMappingURL=verify-persistence.js.map