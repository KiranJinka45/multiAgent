import dotenv from "dotenv";
import path from "path";

// Load .env.local specifically for local development
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });
// Also load .env as fallback
dotenv.config();

const requiredEnvVars = [
    "SUPABASE_SERVICE_ROLE_KEY",
    "NEXT_PUBLIC_SUPABASE_URL",
    "NEXT_PUBLIC_SUPABASE_ANON_KEY",
    "GROQ_API_KEY",
] as const;

export const env = {
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    NODE_ENV: process.env.NODE_ENV || "development",
    WORKER_CONCURRENCY: Number(process.env.WORKER_CONCURRENCY) || 5,
};

// Validation
const missingVars = requiredEnvVars.filter((v) => !process.env[v]);

if (missingVars.length > 0) {
    const errorMsg = `CRITICAL: Missing required environment variables: ${missingVars.join(", ")}`;
    console.error("==========================================");
    console.error(errorMsg);
    console.error("Please check your .env.local file at the project root.");
    console.error("==========================================");
    throw new Error(errorMsg);
}

console.log("Environment variables validated successfully.");
