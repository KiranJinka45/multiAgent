import { z } from 'zod';
import logger from './logger';

const envSchema = z.object({
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    PORT: z.coerce.number().default(3000),
    REDIS_URL: z.string().url().default('redis://localhost:6379'),
    GROQ_API_KEY: z.string().min(1, 'GROQ API key is required'),
    NEXT_PUBLIC_SUPABASE_URL: z.string().url('Supabase URL is required'),
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1, 'Supabase Anon Key is required'),
    SUPABASE_SERVICE_ROLE_KEY: z.string().min(1, 'Supabase Service Role is required'),
    STRIPE_SECRET_KEY: z.string().min(1, 'Stripe Secret Key is required'),
    STRIPE_WEBHOOK_SECRET: z.string().min(1, 'Stripe Webhook Secret is required'),
    WORKER_CONCURRENCY: z.coerce.number().default(5),
    METRICS_TOKEN: z.string().min(1, 'Metrics Authorization Token is required').default('generate-a-secure-token-here'),
});

type EnvVars = z.infer<typeof envSchema>;

let _env: EnvVars;

try {
    _env = envSchema.parse(process.env);
} catch (err) {
    if (err instanceof z.ZodError) {
        const zodError = err as z.ZodError<any>;
        logger.fatal(
            { errors: zodError.errors },
            'Environment validation failed. Missing or invalid required variables.'
        );
        process.exit(1);
    }
    throw err;
}

export const env = _env;
