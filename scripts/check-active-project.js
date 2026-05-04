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
async function checkProject() {
    const supabase = (0, supabase_js_1.createClient)(supabaseUrl, serviceRoleKey);
    const projectId = "9a4b7634-ab3f-43cd-8230-f0ab875820c9";
    const { data: project, error: pErr } = await supabase
        .from('projects')
        .select('*')
        .eq('id', projectId)
        .single();
    if (pErr) {
        console.error("Error fetching project:", pErr);
        return;
    }
    console.log("PROJECT_DATA_START");
    console.log("ID:", project.id);
    console.log("Name:", project.name);
    console.log("Status:", project.status);
    console.log("Description:", project.description);
    console.log("Updated At:", project.updated_at);
    const { data: files, error: fErr } = await supabase
        .from('project_files')
        .select('path')
        .eq('project_id', projectId);
    console.log("Files:", files ? files.length : 0);
    if (files) {
        files.slice(0, 5).forEach(f => console.log(" -", f.path));
    }
    console.log("PROJECT_DATA_END");
}
checkProject();
//# sourceMappingURL=check-active-project.js.map