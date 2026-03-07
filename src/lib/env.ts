import { z } from 'zod';
import logger from '@configs/logger';

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().default(3000),
    REDIS_URL: z.string().url().default('redis://localhost:6379'),
    GROQ_API_KEY: z.string().min(1, 'GROQ API key is required'),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url('Supabase URL is required'),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase Anon Key is required'),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase Service Role is required'),
    STRIPE_SECRET_KEY: z.string().min(1, 'Stripe Secret Key is required').optional(),
    STRIPE_WEBHOOK_SECRET: z.string().min(1, 'Stripe Webhook Secret is required').optional(),
    WORKER_CONCURRENCY: z.coerce.number().default(5),
    METRICS_TOKEN: z.string().min(1, 'Metrics Authorization Token is required').default('generate-a-secure-token-here'),
    GITHUB_CLIENT_ID: z.string().min(1, 'GitHub Client ID is required for push integration').optional(),
    GITHUB_CLIENT_SECRET: z.string().min(1, 'GitHub Client Secret is required for push integration').optional(),
});

type EnvVars = z.infer<typeof envSchema>;

let _env: EnvVars;

try {
    _env = envSchema.parse(process.env);
} catch (err) {
    if (err instanceof z.ZodError) {
        logger.fatal(
            { issues: err.issues },
            'Environment validation failed. Missing or invalid required variables.'
        );
        process.exit(1);
    }
    throw err;
}

export const env = _env;
