import dotenv from 'dotenv';
import { expand } from 'dotenv-expand';
import { z } from 'zod';
import path from 'node:path';

expand(dotenv.config());
// Also load the root .env file if it exists, so all packages in the monorepo can read shared secrets
expand(dotenv.config({ path: path.resolve(process.cwd(), '../../.env') }));

const serverConfigSchema = z.object({
    AUTH_SERVICE_PORT: z.coerce.number().default(8081),
    GATEWAY_PORT: z.coerce.number().default(3501),
    WORKER_PORT: z.coerce.number().default(8082),
    JWT_SECRET: z.string().min(1, 'JWT_SECRET must be defined'),
    JWT_REFRESH_SECRET: z.string().optional(),
    DATABASE_URL: z.string().optional(),
    REDIS_URL: z.string().optional(),
    LLM_PROVIDER: z.string().optional().default('openai'),
    DEFAULT_LLM_MODEL: z.string().optional(),
    OPENAI_API_KEY: z.string().optional(),
    GROQ_API_KEY: z.string().optional(),
    OPENROUTER_API_KEY: z.string().optional(),
});

export const serverConfig = serverConfigSchema.parse(process.env);

export class SecretProvider {
    static async bootstrap() {
        console.log('[SecretProvider] Bootstrapping secrets...');
        return Promise.resolve();
    }
    
    static get(key: string): string | undefined {
        return process.env[key];
    }
}
