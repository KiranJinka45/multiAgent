import dotenv from "dotenv";
import path from "path";
import fs from "fs";

// Standard Environment Loading Logic
const nodeEnv = process.env.NODE_ENV || 'development';
const envFile = nodeEnv === 'production' ? '.env.production' : '.env.development';
const envPath = path.resolve(process.cwd(), envFile);
const envLocalPath = path.resolve(process.cwd(), ".env.local");

// Logic: .env.local (if exists) > .env.{env} (if exists) > process.env (system)
if (fs.existsSync(envLocalPath)) {
    dotenv.config({ path: envLocalPath });
}
if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true });
}
// Final fallback for system-injected variables (Vercel/Railway)
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
    WORKER_CONCURRENCY_FREE: Number(process.env.WORKER_CONCURRENCY_FREE) || 10,
    WORKER_CONCURRENCY_PRO: Number(process.env.WORKER_CONCURRENCY_PRO) || 20,
    WORKER_POOL_SIZE: Number(process.env.WORKER_POOL_SIZE) || 3,
    REDIS_URL: process.env.REDIS_URL || "redis://localhost:6379",
};

// Validation
const isProd = env.NODE_ENV === "production";
const missingVars = requiredEnvVars.filter((v) => !process.env[v]);

if (missingVars.length > 0) {
    const errorMsg = `CRITICAL: Missing required environment variables: ${missingVars.join(", ")}`;
    if (isProd) {
        throw new Error(errorMsg);
    } else {
        console.warn("==========================================");
        console.warn(errorMsg);
        console.warn("Please check your .env.local file.");
        console.warn("==========================================");
    }
}
