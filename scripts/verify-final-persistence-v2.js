"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const supabase_js_1 = require("@libs/supabase/supabase-js");
const dotenv = __importStar(require("dotenv"));
dotenv.config({ path: ".env.local" });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
async function verifyPersistence() {
    const projectId = "9a4b7634-ab3f-43cd-8230-f0ab875820c9";
    const supabase = (0, supabase_js_1.createClient)(supabaseUrl, serviceRoleKey);
    console.log(`🔍 Verifying persistence for project ${projectId}...`);
    const timeout = setTimeout(() => {
        console.error("Timeout reached. Supabase is not responding.");
        process.exit(1);
    }, 15000);
    try {
        // 1. Check project status
        console.log("Fetching project status...");
        const { data: project, error: pError } = await supabase
            .from('projects')
            .select('status, updated_at')
            .eq('id', projectId)
            .single();
        if (pError)
            console.error("Error fetching project:", pError.message);
        else
            console.log(`Project Status: ${project.status}, Updated At: ${project.updated_at}`);
        // 2. Check files
        console.log("Fetching file count...");
        const { count, error: fError } = await supabase
            .from('project_files')
            .select('*', { count: 'exact', head: true })
            .eq('project_id', projectId);
        if (fError)
            console.error("Error fetching files:", fError.message);
        else
            console.log(`File Count in DB: ${count}`);
    }
    catch (err) {
        console.error("Fatal error:", err);
    }
    finally {
        clearTimeout(timeout);
        process.exit(0);
    }
}
verifyPersistence();
//# sourceMappingURL=verify-final-persistence-v2.js.map