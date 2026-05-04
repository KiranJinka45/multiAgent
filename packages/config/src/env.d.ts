import { z } from 'zod';
/**
 * Common environment variables shared across all services.
 */
export declare const commonSchema: z.ZodObject<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<{
        development: "development";
        production: "production";
        test: "test";
    }>>;
    LOG_LEVEL: z.ZodDefault<z.ZodEnum<{
        debug: "debug";
        info: "info";
        fatal: "fatal";
        error: "error";
        warn: "warn";
        trace: "trace";
    }>>;
    DATABASE_URL: z.ZodOptional<z.ZodString>;
    REDIS_URL: z.ZodOptional<z.ZodString>;
    JWT_SECRET: z.ZodOptional<z.ZodString>;
    JWT_REFRESH_SECRET: z.ZodOptional<z.ZodString>;
    INTERNAL_SERVICE_TOKEN: z.ZodOptional<z.ZodString>;
    SUPABASE_URL: z.ZodOptional<z.ZodString>;
    SUPABASE_SERVICE_ROLE_KEY: z.ZodOptional<z.ZodString>;
    NEXT_PUBLIC_API_URL: z.ZodOptional<z.ZodString>;
    NEXT_PUBLIC_SUPABASE_URL: z.ZodOptional<z.ZodString>;
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.ZodOptional<z.ZodString>;
}, z.core.$strip>;
/**
 * Service-specific environment variables.
 */
export declare const serviceSchema: z.ZodObject<{
    AUTH_SERVICE_PORT: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    BILLING_SERVICE_PORT: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    STRIPE_SECRET_KEY: z.ZodOptional<z.ZodString>;
    STRIPE_WEBHOOK_SECRET: z.ZodOptional<z.ZodString>;
    GATEWAY_PORT: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    CORE_API_PORT: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    CORE_ENGINE_PORT: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    CORE_ENGINE_URL: z.ZodDefault<z.ZodString>;
    PREVIEW_URL: z.ZodDefault<z.ZodString>;
}, z.core.$strip>;
/**
 * Combined validation schema.
 */
export declare const envSchema: z.ZodObject<{
    NODE_ENV: z.ZodDefault<z.ZodEnum<{
        development: "development";
        production: "production";
        test: "test";
    }>>;
    LOG_LEVEL: z.ZodDefault<z.ZodEnum<{
        debug: "debug";
        info: "info";
        fatal: "fatal";
        error: "error";
        warn: "warn";
        trace: "trace";
    }>>;
    DATABASE_URL: z.ZodOptional<z.ZodString>;
    REDIS_URL: z.ZodOptional<z.ZodString>;
    JWT_SECRET: z.ZodOptional<z.ZodString>;
    JWT_REFRESH_SECRET: z.ZodOptional<z.ZodString>;
    INTERNAL_SERVICE_TOKEN: z.ZodOptional<z.ZodString>;
    SUPABASE_URL: z.ZodOptional<z.ZodString>;
    SUPABASE_SERVICE_ROLE_KEY: z.ZodOptional<z.ZodString>;
    NEXT_PUBLIC_API_URL: z.ZodOptional<z.ZodString>;
    NEXT_PUBLIC_SUPABASE_URL: z.ZodOptional<z.ZodString>;
    NEXT_PUBLIC_SUPABASE_ANON_KEY: z.ZodOptional<z.ZodString>;
    AUTH_SERVICE_PORT: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    BILLING_SERVICE_PORT: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    STRIPE_SECRET_KEY: z.ZodOptional<z.ZodString>;
    STRIPE_WEBHOOK_SECRET: z.ZodOptional<z.ZodString>;
    GATEWAY_PORT: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    CORE_API_PORT: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    CORE_ENGINE_PORT: z.ZodDefault<z.ZodCoercedNumber<unknown>>;
    CORE_ENGINE_URL: z.ZodDefault<z.ZodString>;
    PREVIEW_URL: z.ZodDefault<z.ZodString>;
}, z.core.$strip>;
/**
 * Validated environment object.
 * This will throw an error immediately on service startup if validation fails.
 */
export declare const env: {
    NODE_ENV: "development" | "production" | "test";
    LOG_LEVEL: "debug" | "info" | "fatal" | "error" | "warn" | "trace";
    AUTH_SERVICE_PORT: number;
    BILLING_SERVICE_PORT: number;
    GATEWAY_PORT: number;
    CORE_API_PORT: number;
    CORE_ENGINE_PORT: number;
    CORE_ENGINE_URL: string;
    PREVIEW_URL: string;
    DATABASE_URL?: string | undefined;
    REDIS_URL?: string | undefined;
    JWT_SECRET?: string | undefined;
    JWT_REFRESH_SECRET?: string | undefined;
    INTERNAL_SERVICE_TOKEN?: string | undefined;
    SUPABASE_URL?: string | undefined;
    SUPABASE_SERVICE_ROLE_KEY?: string | undefined;
    NEXT_PUBLIC_API_URL?: string | undefined;
    NEXT_PUBLIC_SUPABASE_URL?: string | undefined;
    NEXT_PUBLIC_SUPABASE_ANON_KEY?: string | undefined;
    STRIPE_SECRET_KEY?: string | undefined;
    STRIPE_WEBHOOK_SECRET?: string | undefined;
};
export type Env = z.infer<typeof envSchema>;
//# sourceMappingURL=env.d.ts.map