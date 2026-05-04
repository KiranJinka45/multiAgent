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
const dotenv = __importStar(require("dotenv"));
const supabase_js_1 = require("@libs/supabase/supabase-js");
dotenv.config({ path: '.env.local' });
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
async function testTrigger() {
    // 1. Get a session or just bypass if possible? 
    // The API requires session. I'll mock the session by using the service role to get a user if needed, 
    // but the API uses createRouteHandlerClient which depends on cookies.
    // I'll just use my trigger-and-watch.ts logic but point it to the project.
    // Wait, trigger-and-watch.ts bypasses the API and goes straight to BullMQ.
    // That's good for testing the worker, but I want to test the API resilience.
    // Since I can't easily mock cookies for node-fetch without a lot of setup, 
    // I'll just manually run the update logic that I added to the API.
    const supabase = (0, supabase_js_1.createClient)(supabaseUrl, serviceRoleKey);
    const projectId = '9a4b7634-ab3f-43cd-8230-f0ab875820c9';
    const executionId = 'test-' + Date.now();
    console.log(`Testing resilient update for project ${projectId}...`);
    const { error: updateError } = await supabase.from('projects').update({
        status: 'generating',
        last_execution_id: executionId
    }).eq('id', projectId);
    if (updateError) {
        console.warn('Initial update failed (expected if column missing):', updateError.message);
        const { error: retryError } = await supabase.from('projects').update({
            status: 'generating'
        }).eq('id', projectId);
        if (retryError) {
            console.error('Retry update failed:', retryError.message);
        }
        else {
            console.log('Retry update successful (without last_execution_id)!');
        }
    }
    else {
        console.log('Initial update successful (column exists?!)');
    }
}
testTrigger();
//# sourceMappingURL=test-resilient-update.js.map