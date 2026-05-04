import { z } from "zod";
import dotenv from "dotenv";
import path from "path";

// Load .env from root
dotenv.config({ path: path.join(__dirname, "../.env") });

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
  REDIS_URL: z.string().min(1, "REDIS_URL is required"),
  AUTH_SERVICE_PORT: z.string().default("4002"),
  CORE_API_PORT: z.string().default("8081"),
  GATEWAY_PORT: z.string().default("4081"),
  WORKER_PORT: z.string().default("8082"),
  SUPABASE_URL: z.string().url(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  JWT_SECRET: z.string().min(1),
  INTERNAL_SERVICE_TOKEN: z.string().min(1),
  NO_CLUSTER: z.string().optional().transform(v => v === "true"),
});

export const env = envSchema.safeParse(process.env);

if (!env.success) {
  console.error("❌ Invalid environment variables:", JSON.stringify(env.error.format(), null, 2));
  process.exit(1);
}

console.log("✅ Environment validated successfully.");
export const validatedEnv = env.data;
