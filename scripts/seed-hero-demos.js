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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const dotenv = __importStar(require("dotenv"));
const path_1 = __importDefault(require("path"));
// Load environment variables from .env.local
dotenv.config({ path: path_1.default.resolve(process.cwd(), '.env.local') });
dotenv.config(); // Also load .env as fallback
const supabaseClient_1 = require("../libs/shared-utils/lib/supabaseClient");
const HERO_DEMOS = [
    {
        name: 'Nexus AI - Digital Agency',
        description: 'A high-converting, modern landing page for a futuristic AI Agency. Features dark mode, glassmorphism, and a tiered pricing section.',
        project_type: 'nextjs-landing-v1',
        is_public: true,
        thumbnail_url: '/showcase/nexus-ai.png'
    },
    {
        name: 'CloudPulse Dashboard',
        description: 'A sleek SaaS dashboard for cloud monitoring. Features real-time data visualizations and resource health indicators.',
        project_type: 'nextjs-saas-premium',
        is_public: true,
        thumbnail_url: '/showcase/cloudpulse.png'
    },
    {
        name: 'Nova - Link in Bio',
        description: 'A premium, animated Link-in-Bio for digital creators. Soft gradients, bouncy hover effects, and newsletter integration.',
        project_type: 'nextjs-link-bio',
        is_public: true,
        thumbnail_url: '/showcase/nova.png'
    }
];
async function seed() {
    console.log('🚀 Seeding Hero Demos...');
    const supabase = (0, supabaseClient_1.getSupabaseClient)();
    // Check if we already have these demos by name to avoid duplicates
    for (const demo of HERO_DEMOS) {
        const { data: existing } = await supabase
            .from('projects')
            .select('id')
            .eq('name', demo.name)
            .single();
        if (existing) {
            console.log(`Updating existing demo: ${demo.name}`);
            await supabase
                .from('projects')
                .update(demo)
                .eq('id', existing.id);
        }
        else {
            console.log(`Creating new demo: ${demo.name}`);
            // Note: We need a dummy user_id if RLS requires it. 
            // In dev mode, we might need to fetch a valid user_id or use a specific system user.
            const { data: userData } = await supabase.auth.getUser();
            const user_id = userData.user?.id || '00000000-0000-0000-0000-000000000000';
            const { error } = await supabase
                .from('projects')
                .insert([{ ...demo, user_id, status: 'published' }]);
            if (error) {
                console.error(`Error seeding ${demo.name}:`, error.message);
            }
        }
    }
    console.log('✅ Seeding complete!');
}
seed().catch(console.error);
//# sourceMappingURL=seed-hero-demos.js.map